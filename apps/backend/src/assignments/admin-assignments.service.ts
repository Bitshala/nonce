import {
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Assignment } from '@/entities/assignment.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { Cohort } from '@/entities/cohort.entity';
import { CohortMembership } from '@/entities/cohort-membership.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { APITask } from '@/entities/api-task.entity';
import { User } from '@/entities/user.entity';
import { TaskType } from '@/task-processor/task.enums';
import { GitHubAppClient } from '@/github-app/client/github-app.client';
import { CohortsConfigService } from '@/cohorts/cohorts.config.service';
import { CohortsService } from '@/cohorts/cohorts.service';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { RunsService } from '@/assignments/runs.service';
import { ExerciseScoreWritebackService } from '@/assignments/exercise-score-writeback.service';
import { applyAssignmentConfig } from '@/assignments/assignment-seed.util';
import { isRegradeCandidate } from '@nonce/shared/submission-bucket';
import { AssignmentBackend, ProvisionStatus, UserRole } from '@/common/enum';
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
        const existing = await this.assignmentRepository.find({
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
            // One transaction, so a failure cannot leave assignments saved
            // with GRADUATION deadlines still unresolved.
            await this.dbTransactionService.execute(async (manager) => {
                await manager.save(toSave);
                // applyAssignmentConfig cannot resolve a GRADUATION deadline —
                // it sees one week, not the calendar.
                await this.cohortsService.syncAssignmentDeadlines(
                    manager,
                    cohortId,
                );
            });
        }

        this.logger.log(
            `Synced assignments for cohort ${cohortId}: ${created} created, ${updated} updated`,
        );
        return new SyncAssignmentsResponseDto(created, updated);
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
