import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Assignment } from '@/entities/assignment.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { Cohort } from '@/entities/cohort.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { APITask } from '@/entities/api-task.entity';
import { User } from '@/entities/user.entity';
import { TaskType } from '@/task-processor/task.enums';
import { GitHubAppClient } from '@/github-app/client/github-app.client';
import { CohortsConfigService } from '@/cohorts/cohorts.config.service';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { RunsService } from '@/assignments/runs.service';
import { applyAssignmentConfig } from '@/assignments/assignment-seed.util';
import { AssignmentBackend, ProvisionStatus } from '@/common/enum';
import {
    AdminSubmissionResponseDto,
    ArchiveAssignmentResponseDto,
    RegradeResponseDto,
    SyncAssignmentsResponseDto,
} from '@/assignments/assignments.response.dto';
import { UpdateSubmissionScoreRequestDto } from '@/assignments/assignments.request.dto';

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
        @InjectRepository(ExerciseScore)
        private readonly exerciseScoreRepository: Repository<ExerciseScore>,
        private readonly cohortsConfigService: CohortsConfigService,
        private readonly gitHubAppClient: GitHubAppClient,
        private readonly runsService: RunsService,
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

        if (toSave.length > 0) await this.assignmentRepository.save(toSave);

        this.logger.log(
            `Synced assignments for cohort ${cohortId}: ${created} created, ${updated} updated`,
        );
        return new SyncAssignmentsResponseDto(created, updated);
    }

    async listSubmissions(
        assignmentId: string,
    ): Promise<AdminSubmissionResponseDto[]> {
        const assignment = await this.loadAssignment(assignmentId);

        const submissions = await this.submissionRepository.find({
            where: { assignment: { id: assignmentId } },
            relations: { user: true, latestRun: true, bestRun: true },
        });
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

    /** Re-queues provisioning for a submission whose repo never got created. */
    async reprovision(submissionId: string): Promise<void> {
        const submission = await this.submissionRepository.findOne({
            where: { id: submissionId },
        });
        if (!submission) throw new NotFoundException('Submission not found');

        await this.dbTransactionService.execute(async (manager) => {
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
     * Re-dispatches every submission's last commit — for when a grader bug is
     * fixed after students have already run.
     */
    async regrade(
        assignmentId: string,
        actor: User,
    ): Promise<RegradeResponseDto> {
        await this.loadAssignment(assignmentId);

        const submissions = await this.submissionRepository.find({
            where: {
                assignment: { id: assignmentId },
                provisionStatus: ProvisionStatus.READY,
            },
            relations: { user: true },
        });

        let dispatched = 0;
        let skipped = 0;

        for (const submission of submissions) {
            if (!submission.lastCommitSha || !submission.hasStudentCommits) {
                skipped++;
                continue;
            }
            try {
                await this.runsService.createRun(
                    submission.id,
                    submission.lastCommitSha,
                    actor,
                );
                dispatched++;
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
     * Manual score override. Deliberately writes `ExerciseScore` directly and
     * leaves the runs alone — this is for the cases grading cannot express.
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
        const score = await this.exerciseScoreRepository.findOne({
            where: {
                user: { id: submission.user.id },
                cohort: { id: week.cohort.id },
                cohortWeek: { id: week.id },
            },
        });
        if (!score) {
            throw new NotFoundException(
                'No exercise score row exists for this student and week',
            );
        }

        if (request.isSubmitted !== undefined) {
            score.isSubmitted = request.isSubmitted;
        }
        if (request.isPassing !== undefined) {
            score.isPassing = request.isPassing;
        }
        await this.exerciseScoreRepository.save(score);

        this.logger.log(
            `Score override on submission ${submissionId}: submitted=${score.isSubmitted} passing=${score.isPassing}`,
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

    private async loadAssignment(assignmentId: string): Promise<Assignment> {
        const assignment = await this.assignmentRepository.findOne({
            where: { id: assignmentId },
            relations: { cohortWeek: { cohort: true } },
        });
        if (!assignment) throw new NotFoundException('Assignment not found');
        return assignment;
    }
}
