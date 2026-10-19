import {
    BadGatewayException,
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
import type { SwitchBlocker, SwitchBlockerCode } from '@nonce/shared';
import { GitHubClassroomService } from '@/github-classroom/github-classroom.service';
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
    SwitchToInhousePreviewResponseDto,
    SwitchToInhouseResponseDto,
    SyncAssignmentsResponseDto,
} from '@/assignments/assignments.response.dto';
import { UpdateSubmissionScoreRequestDto } from '@/assignments/assignments.request.dto';
import { MailService } from '@/mail/mail.service';
import { ClassroomResultSnapshot } from '@/entities/classroom-result-snapshot.entity';
import { hasGraduated } from '@/cohorts/graduation.util';

/**
 * How long a PROVISIONING row is presumed to have a live worker behind it.
 * Provisioning takes seconds; this only has to outlast a slow GitHub.
 */
const PROVISIONING_LEASE_MS = 10 * 60 * 1000;

/** The members of `ids` who are in `enrolled`; empty if either is missing. */
function onlyEnrolled(
    ids: ReadonlySet<string> | undefined,
    enrolled: ReadonlySet<string> | undefined,
): Set<string> {
    if (!ids || !enrolled) return new Set();
    return new Set([...ids].filter((id) => enrolled.has(id)));
}

/** A reason the switch is refused, with the status the API refuses it with. */
interface SwitchRefusal extends SwitchBlocker {
    status: 400 | 409;
}

/** What `planSwitch` found: the refusals, and the weeks it would seed. */
interface SwitchPlan {
    refusals: SwitchRefusal[];
    toSeed: {
        week: CohortWeek;
        assignment: AssignmentConfig;
        deadline: Date | null;
    }[];
}

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
        @InjectRepository(APITask)
        private readonly apiTaskRepository: Repository<APITask<any>>,
        @InjectRepository(ClassroomResultSnapshot)
        private readonly snapshotRepository: Repository<ClassroomResultSnapshot>,
        private readonly cohortsConfigService: CohortsConfigService,
        private readonly cohortsService: CohortsService,
        private readonly gitHubAppClient: GitHubAppClient,
        private readonly runsService: RunsService,
        private readonly scoreWriteback: ExerciseScoreWritebackService,
        private readonly dbTransactionService: DbTransactionService,
        private readonly githubClassroomService: GitHubClassroomService,
        private readonly mailService: MailService,
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
        // Graduated cohorts are frozen; new or reopened assignments would
        // invite work whose grading could only move final scores.
        if (hasGraduated(cohort.weeks)) {
            throw new ConflictException(
                'This cohort has graduated, so its assignments and scores are final',
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
     * Moves a cohort from GitHub Classroom to the in-house classroom. One-way:
     * going back would orphan provisioned repos and in-house submissions.
     *
     * Drains Classroom first. The periodic sync runs every six hours, so the
     * scores on the rows can be that stale; the switch reads Classroom once
     * more and, in one transaction under the cohort row lock, writes those
     * results, freezes them in `ClassroomResultSnapshot`, flips the backend,
     * stops the Classroom sync and seeds an assignment for every exercise
     * week. From then on writeback derives the cohort's scores from the
     * snapshot plus in-house work (`isSwitchedFromClassroom`).
     */
    async switchToInhouse(
        cohortId: string,
        actorId: string,
    ): Promise<SwitchToInhouseResponseDto> {
        const cohort = await this.cohortRepository.findOne({
            where: { id: cohortId },
            relations: { weeks: true },
        });
        if (!cohort) throw new NotFoundException('Cohort not found');

        // Read once, outside the transaction. The checks it feeds are at day
        // granularity (end of day IST), so the moments the transaction then
        // takes cannot change their answer in practice.
        const now = new Date();
        const config = this.cohortsConfigService.getConfig(cohort.type);
        const plan = this.planSwitch(cohort, config, now);
        // The preview shows every refusal; the switch reports the first.
        const [refusal] = plan.refusals;
        if (refusal) {
            throw refusal.status === 400
                ? new BadRequestException(refusal.message)
                : new ConflictException(refusal.message);
        }

        // Network-bound, so before the transaction rather than inside it,
        // holding the cohort lock for minutes.
        let fetched: Awaited<
            ReturnType<GitHubClassroomService['fetchFinalResults']>
        >;
        try {
            fetched =
                await this.githubClassroomService.fetchFinalResults(cohortId);
        } catch (error) {
            throw new BadGatewayException(
                `Could not read the latest results from GitHub Classroom, so nothing was changed. Try again shortly. (${error.message})`,
            );
        }

        let result: {
            created: number;
            updated: number;
            cancelled: number;
            scoresSynced: number;
            snapshotRows: number;
            switchedAt: Date;
        };
        try {
            result = await this.dbTransactionService.execute(
                async (manager) => {
                    // The same lock the periodic sync takes before it writes,
                    // so a sync that read Classroom before this switch cannot
                    // write after it.
                    const locked = await manager.findOne(Cohort, {
                        where: { id: cohortId },
                        lock: { mode: 'for_no_key_update' },
                    });
                    if (
                        locked?.assignmentBackend !==
                        AssignmentBackend.CLASSROOM
                    ) {
                        throw new ConflictException(
                            'This cohort is already on the in-house classroom',
                        );
                    }

                    const scoresSynced =
                        await this.githubClassroomService.applyFinalResults(
                            manager,
                            fetched,
                        );
                    const snapshotRows = await this.snapshotClassroomResults(
                        manager,
                        cohortId,
                    );

                    const switchedAt = new Date();
                    // Still a compare-and-set, so the flip stays safe even if
                    // the lock above is ever removed.
                    const flipped = await manager.update(
                        Cohort,
                        {
                            id: cohortId,
                            assignmentBackend: AssignmentBackend.CLASSROOM,
                        },
                        {
                            assignmentBackend: AssignmentBackend.INHOUSE,
                            switchedFromClassroomAt: switchedAt,
                            switchedFromClassroomBy: { id: actorId },
                        },
                    );
                    if (flipped.affected !== 1) {
                        throw new ConflictException(
                            'This cohort is already on the in-house classroom',
                        );
                    }

                    // Only syncs that would still run: one already PROCESSING
                    // re-reads the backend under the lock and writes nothing,
                    // and a FAILED one out of retries is left as the record of
                    // its failure.
                    const cancelled = await manager
                        .createQueryBuilder()
                        .update(APITask)
                        .set({ status: APITaskStatus.CANCELLED })
                        .where('type = :type', {
                            type: TaskType.SYNC_CLASSROOM_SCORES,
                        })
                        .andWhere(
                            `(status = :unprocessed OR (status = :failed AND "retryCount" < "retryLimit"))`,
                            {
                                unprocessed: APITaskStatus.UNPROCESSED,
                                failed: APITaskStatus.FAILED,
                            },
                        )
                        .andWhere("data->>'cohortId' = :cohortId", {
                            cohortId,
                        })
                        .execute();

                    const seeded = await this.seedFromConfig(
                        manager,
                        cohort,
                        config,
                    );

                    // Queued with the switch, so the students are told
                    // exactly when it commits, and never about one that
                    // rolled back.
                    await manager.save(
                        manager.create(APITask, {
                            type: TaskType.SEND_CLASSROOM_SWITCH_EMAILS,
                            data: { cohortId },
                        }),
                    );

                    return {
                        ...seeded,
                        cancelled: cancelled.affected ?? 0,
                        scoresSynced,
                        snapshotRows,
                        switchedAt,
                    };
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
            `Switched cohort to in-house classroom: cohortId=${cohortId} actorId=${actorId} scoresSynced=${result.scoresSynced} snapshotRows=${result.snapshotRows} created=${result.created} updated=${result.updated} cancelledTasks=${result.cancelled}`,
        );
        return new SwitchToInhouseResponseDto({
            created: result.created,
            updated: result.updated,
            cancelledTasks: result.cancelled,
            scoresSynced: result.scoresSynced,
            snapshotRows: result.snapshotRows,
            switchedAt: result.switchedAt.toISOString(),
        });
    }

    /**
     * What a switch would do to this cohort right now, and what would refuse
     * it, so the admin sees the impact before an irreversible action and the
     * UI only offers the switch when it can succeed. Writes nothing.
     */
    async previewSwitchToInhouse(
        cohortId: string,
    ): Promise<SwitchToInhousePreviewResponseDto> {
        const cohort = await this.cohortRepository.findOne({
            where: { id: cohortId },
            relations: { weeks: true },
        });
        if (!cohort) throw new NotFoundException('Cohort not found');

        const now = new Date();
        const config = this.cohortsConfigService.getConfig(cohort.type);
        const plan = this.planSwitch(cohort, config, now);

        const studentCount = await this.membershipRepository.count({
            where: { cohort: { id: cohortId } },
        });
        const started = cohort.weeks
            .filter((week) => week.scheduledDate <= now)
            .sort((a, b) => b.week - a.week);
        // Task rows are pruned after 30 days, so an old cohort can read null.
        const lastSync = await this.apiTaskRepository
            .createQueryBuilder('task')
            .where('task.type = :type', {
                type: TaskType.SYNC_CLASSROOM_SCORES,
            })
            .andWhere('task.status = :status', {
                status: APITaskStatus.PROCESSED,
            })
            .andWhere("task.data->>'cohortId' = :cohortId", { cohortId })
            .orderBy('task.updatedAt', 'DESC')
            .getOne();

        return new SwitchToInhousePreviewResponseDto({
            canSwitch: plan.refusals.length === 0,
            blockers: plan.refusals.map(({ code, message }) => ({
                code,
                message,
            })),
            studentCount,
            currentWeek: started[0]?.week ?? null,
            weeksToSeed: plan.toSeed.map(({ week, deadline }) => ({
                week: week.week,
                title: week.title ?? null,
                deadline: deadline?.toISOString() ?? null,
            })),
            lastClassroomSyncAt: lastSync?.updatedAt.toISOString() ?? null,
        });
    }

    /**
     * Everything that would refuse a switch, without writing anything. Shared
     * by the switch and its preview, so the preview can never promise a
     * switch the switch then refuses.
     */
    private planSwitch(
        cohort: Cohort,
        config: CohortConfig,
        now: Date,
    ): SwitchPlan {
        const refusals: SwitchRefusal[] = [];
        const refuse = (
            code: SwitchBlockerCode,
            status: 400 | 409,
            message: string,
        ) => refusals.push({ code, status, message });

        if (cohort.assignmentBackend !== AssignmentBackend.CLASSROOM) {
            refuse(
                'ALREADY_INHOUSE',
                409,
                'This cohort is already on the in-house classroom',
            );
        }
        if (!cohort.hasExercises) {
            refuse(
                'NO_EXERCISES',
                400,
                'This cohort has no exercises, so there is nothing to switch',
            );
        }
        // Without a Classroom to read, there are no Classroom results to keep.
        if (cohort.classroomId == null) {
            refuse(
                'NO_CLASSROOM_ID',
                409,
                'This cohort has no GitHub Classroom id, so it cannot be switched',
            );
        }

        const graduation = cohort.weeks.find(
            (week) => week.type === CohortWeekType.GRADUATION,
        );
        if (!graduation) {
            throw new ServiceError(
                `Cohort ${cohort.id} has no graduation week`,
            );
        }
        // A graduated cohort's scores are final; switching it would expose
        // them to in-house activity.
        if (isGraduationPassed(graduation.scheduledDate, now)) {
            refuse(
                'GRADUATED',
                409,
                'This cohort has graduated, so its scores are final and it cannot be switched',
            );
        }

        const unconfigured: number[] = [];
        const pastDue: number[] = [];
        const toSeed: SwitchPlan['toSeed'] = [];
        for (const week of cohort.weeks
            .filter((w) => w.hasExercise)
            .sort((a, b) => a.week - b.week)) {
            const assignment = config.weeks[week.week - 1]?.assignment;
            if (!assignment) {
                unconfigured.push(week.week);
                continue;
            }
            // Resolved the way seeding will resolve it, GRADUATION included.
            const preview = applyAssignmentConfig(
                new Assignment(),
                assignment,
                week,
                cohort.season,
            );
            if (
                preview.deadlineSource === AssignmentDeadlineSource.GRADUATION
            ) {
                preview.deadline = resolveDeadline(
                    preview.deadlineSource,
                    week.scheduledDate,
                    graduation.scheduledDate,
                    preview.deadlineDaysAfterWeek,
                );
            }
            toSeed.push({ week, assignment, deadline: preview.deadline });
            // Past weeks are seeded too, so none may open already past due:
            // no run on it could ever count.
            if (preview.isPastDeadline(now)) pastDue.push(week.week);
        }
        if (unconfigured.length > 0) {
            refuse(
                'UNCONFIGURED_WEEKS',
                400,
                `The ${cohort.type} config has no assignment for exercise week(s) ${unconfigured.join(', ')}`,
            );
        }
        if (pastDue.length > 0) {
            refuse(
                'PAST_DUE_WEEKS',
                409,
                `Exercise week(s) ${pastDue.join(', ')} would already be past their deadline, so the cohort cannot be switched`,
            );
        }

        return { refusals, toSeed };
    }

    /**
     * Freezes every Classroom result the cohort's score rows now hold. Runs
     * after the final Classroom read and before the flip, in the switch's
     * transaction, so the snapshot is exactly what Classroom last reported.
     */
    private async snapshotClassroomResults(
        manager: EntityManager,
        cohortId: string,
    ): Promise<number> {
        const inserted: unknown[] = await manager.query(
            `INSERT INTO "classroom_result_snapshot"
                ("userId", "cohortId", "cohortWeekId", "isSubmitted", "isPassing", "classroomRepositoryUrl")
             SELECT "userId", "cohortId", "cohortWeekId", "isSubmitted", "isPassing", "classroomRepositoryUrl"
             FROM "exercise_score"
             WHERE "cohortId" = $1
               AND "userId" IS NOT NULL
               AND "cohortWeekId" IS NOT NULL
             RETURNING "id"`,
            [cohortId],
        );
        return inserted.length;
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
        const [submissions, studentsByCohort, classroomPassers] =
            await Promise.all([
                this.submissionRepository.find({
                    relations: {
                        assignment: true,
                        user: true,
                        bestRun: true,
                        latestRun: true,
                    },
                }),
                this.currentStudentsByCohort(),
                this.classroomPassersByWeek(assignments),
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
                        onlyEnrolled(
                            classroomPassers.get(assignment.cohortWeek.id),
                            studentsByCohort.get(
                                assignment.cohortWeek.cohort.id,
                            ),
                        ),
                    ),
            );
    }

    /**
     * Who passed each week on GitHub Classroom before their cohort switched,
     * keyed by cohort week. Without it, staff would see "no one has started"
     * on weeks most of the cohort already passed. One query, and only for
     * cohorts that switched.
     */
    private async classroomPassersByWeek(
        assignments: Assignment[],
    ): Promise<Map<string, Set<string>>> {
        const weekIds = assignments
            .filter((a) => a.cohortWeek.cohort.switchedFromClassroomAt)
            .map((a) => a.cohortWeek.id);
        const byWeek = new Map<string, Set<string>>();
        if (weekIds.length === 0) return byWeek;

        const passes = await this.snapshotRepository.find({
            where: { cohortWeek: { id: In(weekIds) }, isPassing: true },
            relations: { user: true, cohortWeek: true },
        });
        for (const pass of passes) {
            const users = byWeek.get(pass.cohortWeek.id) ?? new Set<string>();
            users.add(pass.user.id);
            byWeek.set(pass.cohortWeek.id, users);
        }
        return byWeek;
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
        const passers =
            (await this.classroomPassersByWeek([assignment])).get(
                assignment.cohortWeek.id,
            ) ?? new Set<string>();

        return submissions.map(
            (submission) =>
                new AdminSubmissionResponseDto(
                    submission,
                    assignmentId,
                    scoreByUser.get(submission.user.id) ?? null,
                    passers.has(submission.user.id),
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
        const passers =
            (await this.classroomPassersByWeek([assignment])).get(
                assignment.cohortWeek.id,
            ) ?? new Set<string>();

        let dispatched = 0;
        let skipped = 0;

        for (const submission of submissions) {
            // The same rule as the count on the admin's re-grade button.
            if (
                !isRegradeCandidate(submission, passers.has(submission.user.id))
            ) {
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
                assignment: { cohortWeek: { cohort: { weeks: true } } },
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

        // Refused rather than stored: a pin writeback then declined to apply
        // would show staff an override that changed nothing.
        if (hasGraduated(week.cohort.weeks)) {
            throw new ConflictException(
                'This cohort has graduated, so its scores are final',
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
    /**
     * Emails every student of a cohort that just left GitHub Classroom. A
     * failed send is logged and skipped rather than retried for everyone: a
     * retry of the whole task would email the rest a second time.
     */
    async handleSendClassroomSwitchEmails(
        task: APITask<TaskType.SEND_CLASSROOM_SWITCH_EMAILS>,
    ): Promise<void> {
        const { cohortId } = task.data;
        const cohort = await this.cohortRepository.findOne({
            where: { id: cohortId },
            relations: { memberships: { user: true } },
        });
        if (!cohort) {
            throw new ServiceError(
                `Cohort ${cohortId} not found for Classroom switch emails`,
            );
        }
        if (!cohort.switchedFromClassroomAt) {
            throw new ServiceError(
                `Cohort ${cohortId} has not switched from GitHub Classroom`,
            );
        }

        const cohortName = this.mailService.getCohortShortName(cohort.type);
        const season = `Season ${cohort.season.toString().padStart(2, '0')}`;
        const users = cohort.memberships.map((m) => m.user);

        this.logger.log(
            `Sending Classroom switch emails to ${users.length} users for cohort ${cohortId}`,
        );

        for (const user of users) {
            if (!user.email) {
                this.logger.warn(
                    `User ${user.id} does not have an email address, skipping Classroom switch email`,
                );
                continue;
            }
            try {
                await this.mailService.sendClassroomSwitchEmail(
                    user.email,
                    user.displayName,
                    cohortName,
                    season,
                    cohort.switchedFromClassroomAt,
                );
            } catch (error) {
                this.logger.error(
                    `Failed to send Classroom switch email to user ${user.id}: ${error.message}`,
                    error.stack,
                );
            }
        }
    }

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
