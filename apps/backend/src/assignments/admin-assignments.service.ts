import {
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Assignment } from '@/entities/assignment.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { Cohort } from '@/entities/cohort.entity';
import { CohortMembership } from '@/entities/cohort-membership.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { APITask } from '@/entities/api-task.entity';
import { User } from '@/entities/user.entity';
import { APITaskStatus, TaskType } from '@/task-processor/task.enums';
import { GitHubAppClient } from '@/github-app/client/github-app.client';
import { CohortsConfigService } from '@/cohorts/cohorts.config.service';
import { AssignmentConfig, CohortConfig } from '@/cohorts/cohorts.config.model';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { CohortsService } from '@/cohorts/cohorts.service';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { RunsService } from '@/assignments/runs.service';
import { ExerciseScoreWritebackService } from '@/assignments/exercise-score-writeback.service';
import {
    applyAssignmentConfig,
    resolveDeadline,
} from '@/assignments/assignment-seed.util';
import { isUniqueViolation, ServiceError } from '@/common/errors';
import { isGraduationPassed } from '@nonce/shared/deadline';
import { isRegradeCandidate } from '@nonce/shared/submission-bucket';
import {
    AssignmentBackend,
    AssignmentDeadlineSource,
    CohortWeekType,
    ProvisionStatus,
    UserRole,
} from '@/common/enum';
import {
    AdminAssignmentResponseDto,
    AdminSubmissionResponseDto,
    ArchiveAssignmentResponseDto,
    RegradeResponseDto,
    SyncAssignmentsResponseDto,
} from '@/assignments/assignments.response.dto';
import { UpdateSubmissionScoreRequestDto } from '@/assignments/assignments.request.dto';

/**
 * How long a PROVISIONING row is presumed to have a live worker behind it.
 * Provisioning takes seconds; this only has to outlast a slow GitHub.
 */
const PROVISIONING_LEASE_MS = 10 * 60 * 1000;

/**
 * Staff operations on assignments: repairing provisioning, re-grading, manual
 * score overrides, and end-of-cohort archival.
 *
 * There is deliberately no assignment CRUD here — assignments are authored in
 * the cohort config and seeded at creation, so the only write path is a re-sync
 * from that config.
 */
@Injectable()
export class AdminAssignmentsService {
    private readonly logger = new Logger(AdminAssignmentsService.name);
    private readonly org: string;

    constructor(
        @InjectRepository(Assignment)
        private readonly assignmentRepository: Repository<Assignment>,
        @InjectRepository(AssignmentSubmission)
        private readonly submissionRepository: Repository<AssignmentSubmission>,
        @InjectRepository(Cohort)
        private readonly cohortRepository: Repository<Cohort>,
        @InjectRepository(CohortMembership)
        private readonly membershipRepository: Repository<CohortMembership>,
        @InjectRepository(ExerciseScore)
        private readonly exerciseScoreRepository: Repository<ExerciseScore>,
        private readonly cohortsConfigService: CohortsConfigService,
        private readonly cohortsService: CohortsService,
        private readonly gitHubAppClient: GitHubAppClient,
        private readonly runsService: RunsService,
        private readonly scoreWriteback: ExerciseScoreWritebackService,
        private readonly dbTransactionService: DbTransactionService,
        configService: ConfigService,
    ) {
        this.org = configService.get<string>('githubApp.org') ?? '';
    }

    /**
     * Re-reads the cohort config and upserts `Assignment` rows for a cohort.
     * Cohorts are created once, so without this a config typo would mean
     * recreating the cohort.
     */
    async syncAssignments(
        cohortId: string,
    ): Promise<SyncAssignmentsResponseDto> {
        const cohort = await this.cohortRepository.findOne({
            where: { id: cohortId },
            relations: { weeks: true },
        });
        if (!cohort) throw new NotFoundException('Cohort not found');
        if (cohort.assignmentBackend !== AssignmentBackend.INHOUSE) {
            throw new NotFoundException(
                'This cohort is not on the in-house assignment backend',
            );
        }

        const config = this.cohortsConfigService.getConfig(cohort.type);
        // One transaction, so a failure cannot leave assignments saved with
        // GRADUATION deadlines still unresolved.
        const { created, updated } = await this.dbTransactionService.execute(
            (manager) => this.seedFromConfig(manager, cohort, config),
        );

        this.logger.log(
            `Synced assignments for cohort ${cohortId}: ${created} created, ${updated} updated`,
        );
        return new SyncAssignmentsResponseDto(created, updated);
    }

    /**
     * Moves a cohort from GitHub Classroom to the in-house classroom: flips its
     * backend, stops the Classroom score sync, and seeds an assignment for
     * every exercise week from config, in one transaction. One-way — going
     * back would orphan provisioned repos and in-house submissions.
     *
     * Writes no `ExerciseScore`. Classroom results stay on the rows, and
     * writeback only ever raises them on a switched cohort
     * (`isSwitchedFromClassroom`).
     */
    async switchToInhouse(
        cohortId: string,
        actorId: string,
    ): Promise<SyncAssignmentsResponseDto> {
        const cohort = await this.cohortRepository.findOne({
            where: { id: cohortId },
            relations: { weeks: true },
        });
        if (!cohort) throw new NotFoundException('Cohort not found');
        // Fast path only; the compare-and-set below is what decides a race.
        if (cohort.assignmentBackend !== AssignmentBackend.CLASSROOM) {
            throw new ConflictException(
                'This cohort is already on the in-house classroom',
            );
        }
        if (!cohort.hasExercises) {
            throw new BadRequestException(
                'This cohort has no exercises, so there is nothing to switch',
            );
        }
        // The switch keeps classroomId as the mark of a switched cohort.
        // Without one, the cohort would read as natively in-house and
        // writeback would stop protecting its Classroom results.
        if (cohort.classroomId == null) {
            throw new ConflictException(
                'This cohort has no GitHub Classroom id, so it cannot be switched',
            );
        }

        const graduation = cohort.weeks.find(
            (week) => week.type === CohortWeekType.GRADUATION,
        );
        if (!graduation) {
            throw new ServiceError(`Cohort ${cohortId} has no graduation week`);
        }
        const now = new Date();
        // A graduated cohort's scores are final; switching it would expose
        // them to in-house activity.
        if (isGraduationPassed(graduation.scheduledDate, now)) {
            throw new ConflictException(
                'This cohort has graduated, so its scores are final and it cannot be switched',
            );
        }

        const config = this.cohortsConfigService.getConfig(cohort.type);
        const unconfigured: number[] = [];
        const toSeed: { week: CohortWeek; assignment: AssignmentConfig }[] = [];
        for (const week of cohort.weeks
            .filter((w) => w.hasExercise)
            .sort((a, b) => a.week - b.week)) {
            const assignment = config.weeks[week.week - 1]?.assignment;
            if (assignment) toSeed.push({ week, assignment });
            else unconfigured.push(week.week);
        }
        if (unconfigured.length > 0) {
            throw new BadRequestException(
                `The ${cohort.type} config has no assignment for exercise week(s) ${unconfigured.join(', ')}`,
            );
        }

        // Past weeks are seeded too, so check that none would open already
        // past due: no run on it could ever count. Resolved the way seeding
        // will resolve it, GRADUATION included.
        const pastDue = toSeed
            .filter(({ week, assignment }) => {
                const preview = applyAssignmentConfig(
                    new Assignment(),
                    assignment,
                    week,
                    cohort.season,
                );
                if (
                    preview.deadlineSource ===
                    AssignmentDeadlineSource.GRADUATION
                ) {
                    preview.deadline = resolveDeadline(
                        preview.deadlineSource,
                        week.scheduledDate,
                        graduation.scheduledDate,
                        preview.deadlineDaysAfterWeek,
                    );
                }
                return preview.isPastDeadline(now);
            })
            .map(({ week }) => week.week);
        if (pastDue.length > 0) {
            throw new ConflictException(
                `Exercise week(s) ${pastDue.join(', ')} would already be past their deadline, so the cohort cannot be switched`,
            );
        }

        let result: { created: number; updated: number; cancelled: number };
        try {
            result = await this.dbTransactionService.execute(
                async (manager) => {
                    const flipped = await manager.update(
                        Cohort,
                        {
                            id: cohortId,
                            assignmentBackend: AssignmentBackend.CLASSROOM,
                        },
                        { assignmentBackend: AssignmentBackend.INHOUSE },
                    );
                    if (flipped.affected !== 1) {
                        throw new ConflictException(
                            'This cohort is already on the in-house classroom',
                        );
                    }

                    // FAILED tasks with retries left are picked up again too.
                    const cancelled = await manager
                        .createQueryBuilder()
                        .update(APITask)
                        .set({ status: APITaskStatus.CANCELLED })
                        .where('type = :type', {
                            type: TaskType.SYNC_CLASSROOM_SCORES,
                        })
                        .andWhere('status IN (:...statuses)', {
                            statuses: [
                                APITaskStatus.UNPROCESSED,
                                APITaskStatus.FAILED,
                            ],
                        })
                        .andWhere("data->>'cohortId' = :cohortId", {
                            cohortId,
                        })
                        .execute();

                    const seeded = await this.seedFromConfig(
                        manager,
                        cohort,
                        config,
                    );
                    return { ...seeded, cancelled: cancelled.affected ?? 0 };
                },
            );
        } catch (error) {
            // Most likely an assignment slug another cohort already uses.
            if (isUniqueViolation(error)) {
                const detail = (error.driverError as { detail?: string })
                    .detail;
                throw new ConflictException(
                    `Seeding this cohort's assignments would duplicate an existing one: ${detail ?? error.message}`,
                );
            }
            throw error;
        }

        this.logger.log(
            `Switched cohort to in-house classroom: cohortId=${cohortId} actorId=${actorId} created=${result.created} updated=${result.updated} cancelledTasks=${result.cancelled}`,
        );
        return new SyncAssignmentsResponseDto(result.created, result.updated);
    }

    /**
     * Upserts one `Assignment` per exercise week that has an `assignment`
     * block in config, then resolves their deadlines. Runs in the caller's
     * transaction: both the re-sync and the switch to in-house need the rows
     * and their deadlines to land together.
     */
    private async seedFromConfig(
        manager: EntityManager,
        cohort: Cohort,
        config: CohortConfig,
    ): Promise<{ created: number; updated: number }> {
        const existing = await manager.find(Assignment, {
            where: { cohortWeek: { id: In(cohort.weeks.map((w) => w.id)) } },
            relations: { cohortWeek: true },
        });
        const byWeekId = new Map(
            existing.map((a) => [a.cohortWeek.id, a] as const),
        );

        let created = 0;
        let updated = 0;
        const toSave: Assignment[] = [];

        for (const week of cohort.weeks) {
            if (!week.hasExercise) continue;
            const weekConfig = config.weeks[week.week - 1];
            if (!weekConfig?.assignment) continue;

            const current = byWeekId.get(week.id);
            if (current) updated++;
            else created++;

            toSave.push(
                applyAssignmentConfig(
                    current ?? new Assignment(),
                    weekConfig.assignment,
                    week,
                    cohort.season,
                ),
            );
        }

        if (toSave.length > 0) {
            await manager.save(toSave);
            // applyAssignmentConfig cannot resolve a GRADUATION deadline — it
            // sees one week, not the calendar.
            await this.cohortsService.syncAssignmentDeadlines(
                manager,
                cohort.id,
            );
        }

        return { created, updated };
    }

    /** Every assignment in every cohort, drafts included, with submission tallies. */
    async listAssignments(): Promise<AdminAssignmentResponseDto[]> {
        const assignments = await this.assignmentRepository.find({
            relations: { cohortWeek: { cohort: true } },
        });
        if (assignments.length === 0) return [];

        // ponytail: loads every submission to tally in memory; switch to a GROUP BY if this grows past a few thousand.
        const [submissions, studentsByCohort] = await Promise.all([
            this.submissionRepository.find({
                relations: {
                    assignment: true,
                    user: true,
                    bestRun: true,
                    latestRun: true,
                },
            }),
            this.currentStudentsByCohort(),
        ]);
        const cohortOf = new Map(
            assignments.map((a) => [a.id, a.cohortWeek.cohort.id] as const),
        );
        const byAssignment = new Map<string, AssignmentSubmission[]>();
        for (const submission of submissions) {
            const cohortId = cohortOf.get(submission.assignment.id);
            if (!cohortId) continue;
            if (!studentsByCohort.get(cohortId)?.has(submission.user.id))
                continue;
            const list = byAssignment.get(submission.assignment.id) ?? [];
            list.push(submission);
            byAssignment.set(submission.assignment.id, list);
        }

        return assignments
            .sort(
                (a, b) =>
                    b.cohortWeek.cohort.season - a.cohortWeek.cohort.season ||
                    a.cohortWeek.cohort.type.localeCompare(
                        b.cohortWeek.cohort.type,
                    ) ||
                    a.cohortWeek.week - b.cohortWeek.week,
            )
            .map(
                (assignment) =>
                    new AdminAssignmentResponseDto(
                        assignment,
                        byAssignment.get(assignment.id) ?? [],
                        studentsByCohort.get(assignment.cohortWeek.cohort.id)
                            ?.size ?? 0,
                    ),
            );
    }

    async listSubmissions(
        assignmentId: string,
    ): Promise<AdminSubmissionResponseDto[]> {
        const assignment = await this.loadAssignment(assignmentId);

        const students = await this.currentStudentIds(
            assignment.cohortWeek.cohort.id,
        );
        const submissions = (
            await this.submissionRepository.find({
                where: { assignment: { id: assignmentId } },
                relations: { user: true, latestRun: true, bestRun: true },
            })
        ).filter((submission) => students.has(submission.user.id));
        if (submissions.length === 0) return [];

        const scores = await this.exerciseScoreRepository.find({
            where: {
                cohort: { id: assignment.cohortWeek.cohort.id },
                cohortWeek: { id: assignment.cohortWeek.id },
                user: { id: In(submissions.map((s) => s.user.id)) },
            },
            relations: { user: true },
        });
        const scoreByUser = new Map(scores.map((s) => [s.user.id, s] as const));

        return submissions.map(
            (submission) =>
                new AdminSubmissionResponseDto(
                    submission,
                    assignmentId,
                    scoreByUser.get(submission.user.id) ?? null,
                ),
        );
    }

    /**
     * Re-queues provisioning for a submission whose repo never got created.
     *
     * Refuses a READY submission: provisioning it again would re-adopt the repo
     * and record the student's current head as the template commit, which
     * reads as "nothing submitted". Refuses one still provisioning, too, unless
     * its worker has been silent past the lease — the task processor never
     * re-runs a task that died mid-run, so this is the way out for one.
     */
    async reprovision(submissionId: string): Promise<void> {
        await this.dbTransactionService.execute(async (manager) => {
            // Locked so two reprovisions cannot both get past the checks.
            const submission = await manager.findOne(AssignmentSubmission, {
                where: { id: submissionId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!submission) {
                throw new NotFoundException('Submission not found');
            }
            if (submission.provisionStatus === ProvisionStatus.READY) {
                throw new ConflictException(
                    'This submission already has its repository',
                );
            }
            if (
                submission.provisionStatus === ProvisionStatus.PROVISIONING &&
                Date.now() - submission.updatedAt.getTime() <
                    PROVISIONING_LEASE_MS
            ) {
                throw new ConflictException(
                    'Provisioning is already running for this submission',
                );
            }

            await manager.update(
                AssignmentSubmission,
                { id: submissionId },
                {
                    provisionStatus: ProvisionStatus.PENDING,
                    provisionError: null,
                },
            );

            const task = new APITask<TaskType.PROVISION_ASSIGNMENT_REPO>();
            task.type = TaskType.PROVISION_ASSIGNMENT_REPO;
            task.data = { submissionId };
            await manager.save(task);
        });

        this.logger.log(
            `Re-queued provisioning for submission ${submissionId}`,
        );
    }

    /**
     * Re-grades every submission whose score grading could still change — for
     * when a grader bug is fixed after students have already run. `RunsService.dispatchRegrade`
     * decides which commit is graded; this only picks who gets one.
     */
    async regrade(
        assignmentId: string,
        actor: User,
    ): Promise<RegradeResponseDto> {
        const assignment = await this.loadAssignment(assignmentId);

        const students = await this.currentStudentIds(
            assignment.cohortWeek.cohort.id,
        );
        const submissions = (
            await this.submissionRepository.find({
                where: {
                    assignment: { id: assignmentId },
                    provisionStatus: ProvisionStatus.READY,
                },
                relations: { user: true, bestRun: true },
            })
        ).filter((submission) => students.has(submission.user.id));

        let dispatched = 0;
        let skipped = 0;

        for (const submission of submissions) {
            // The same rule as the count on the admin's re-grade button.
            if (!isRegradeCandidate(submission)) {
                skipped++;
                continue;
            }
            try {
                const run = await this.runsService.dispatchRegrade(
                    submission,
                    assignment,
                    actor,
                );
                if (run) dispatched++;
                else skipped++;
            } catch (error) {
                skipped++;
                this.logger.warn(
                    `Regrade skipped submission ${submission.id}: ${error instanceof Error ? error.message : error}`,
                );
            }
        }

        this.logger.log(
            `Regraded assignment ${assignmentId}: ${dispatched} dispatched, ${skipped} skipped`,
        );
        return new RegradeResponseDto(dispatched, skipped);
    }

    /**
     * Manual score override, for the cases grading cannot express.
     *
     * The override is stored on the submission as a pin, and writeback applies
     * it. Writing `ExerciseScore` directly would not stick: every save and run
     * re-syncs it from grading. Per field, a boolean pins it, null clears the
     * pin and hands the field back to grading, and leaving it out changes
     * nothing.
     */
    async overrideScore(
        submissionId: string,
        request: UpdateSubmissionScoreRequestDto,
    ): Promise<void> {
        const submission = await this.submissionRepository.findOne({
            where: { id: submissionId },
            relations: {
                user: true,
                assignment: { cohortWeek: { cohort: true } },
            },
        });
        if (!submission) throw new NotFoundException('Submission not found');

        const week = submission.assignment.cohortWeek;
        const hasScore = await this.exerciseScoreRepository.exists({
            where: {
                user: { id: submission.user.id },
                cohort: { id: week.cohort.id },
                cohortWeek: { id: week.id },
            },
        });
        if (!hasScore) {
            throw new NotFoundException(
                'No exercise score row exists for this student and week',
            );
        }

        const pins: Partial<AssignmentSubmission> = {};
        if (request.isSubmitted !== undefined) {
            pins.isSubmittedOverride = request.isSubmitted;
        }
        if (request.isPassing !== undefined) {
            pins.isPassingOverride = request.isPassing;
        }

        await this.dbTransactionService.execute(async (manager) => {
            if (Object.keys(pins).length > 0) {
                await manager.update(
                    AssignmentSubmission,
                    { id: submissionId },
                    pins,
                );
            }
            await this.scoreWriteback.sync(manager, submissionId);
        });

        this.logger.log(
            `Score override on submission ${submissionId}: submitted=${describePin(request.isSubmitted)} passing=${describePin(request.isPassing)}`,
        );
    }

    /** Queues read-only archival of every repo in a cohort. */
    async queueArchive(cohortId: string): Promise<void> {
        const cohort = await this.cohortRepository.findOne({
            where: { id: cohortId },
        });
        if (!cohort) throw new NotFoundException('Cohort not found');

        const task = new APITask<TaskType.ARCHIVE_ASSIGNMENT_REPOS>();
        task.type = TaskType.ARCHIVE_ASSIGNMENT_REPOS;
        task.data = { cohortId };
        await this.assignmentRepository.manager.save(task);
    }

    /**
     * Archiving makes the repos read-only rather than deleting them. Students
     * keep their work via the zip export; throwing it away would be a poor
     * outcome for something they spent a cohort on.
     */
    async handleArchiveAssignmentRepos(
        task: APITask<TaskType.ARCHIVE_ASSIGNMENT_REPOS>,
    ): Promise<ArchiveAssignmentResponseDto> {
        const { cohortId } = task.data;

        const submissions = await this.submissionRepository.find({
            where: {
                assignment: { cohortWeek: { cohort: { id: cohortId } } },
                provisionStatus: ProvisionStatus.READY,
            },
        });

        let archived = 0;
        let failed = 0;

        for (const submission of submissions) {
            if (!submission.repoOwner || !submission.repoName) continue;
            try {
                await this.gitHubAppClient.archiveRepo(
                    submission.repoOwner,
                    submission.repoName,
                );
                archived++;
            } catch (error) {
                failed++;
                this.logger.warn(
                    `Could not archive ${submission.repoFullName}: ${error instanceof Error ? error.message : error}`,
                );
            }
        }

        this.logger.log(
            `Archived ${archived} repos for cohort ${cohortId} (${failed} failed)`,
        );
        return new ArchiveAssignmentResponseDto(archived, failed);
    }

    /**
     * The students enrolled in a cohort right now. Every cohort-facing view of
     * its submissions is limited to them: staff can accept and run an
     * assignment without being part of the cohort's progress, and a removed
     * student's submission stays behind but no longer counts — re-grading it
     * would only spend Actions minutes on a score nobody reads.
     */
    private async currentStudentIds(cohortId: string): Promise<Set<string>> {
        const byCohort = await this.currentStudentsByCohort(cohortId);
        return byCohort.get(cohortId) ?? new Set();
    }

    /**
     * `currentStudentIds` for one cohort or, without an id, every cohort at
     * once — what the tallies need. One query either way, and one rule.
     */
    private async currentStudentsByCohort(
        cohortId?: string,
    ): Promise<Map<string, Set<string>>> {
        const memberships = await this.membershipRepository.find({
            where: {
                ...(cohortId ? { cohort: { id: cohortId } } : {}),
                user: { role: UserRole.STUDENT },
            },
            relations: { cohort: true, user: true },
        });
        const byCohort = new Map<string, Set<string>>();
        for (const membership of memberships) {
            const students = byCohort.get(membership.cohort.id) ?? new Set();
            students.add(membership.user.id);
            byCohort.set(membership.cohort.id, students);
        }
        return byCohort;
    }

    private async loadAssignment(assignmentId: string): Promise<Assignment> {
        const assignment = await this.assignmentRepository.findOne({
            where: { id: assignmentId },
            relations: { cohortWeek: { cohort: true } },
        });
        if (!assignment) throw new NotFoundException('Assignment not found');
        return assignment;
    }
}

function describePin(pin: boolean | null | undefined): string {
    if (pin === undefined) return 'unchanged';
    return pin === null ? 'cleared' : `pinned ${pin}`;
}
