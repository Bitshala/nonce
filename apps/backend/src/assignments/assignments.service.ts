import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { Assignment } from '@/entities/assignment.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { CIRun } from '@/entities/ci-run.entity';
import { CohortMembership } from '@/entities/cohort-membership.entity';
import { User } from '@/entities/user.entity';
import { APITask } from '@/entities/api-task.entity';
import { TaskType } from '@/task-processor/task.enums';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { AssignmentStatus, UserRole } from '@/common/enum';
import { isAtLeastRole } from '@/cohorts/cohort-access.util';
import {
    AssignmentDetailResponseDto,
    AssignmentSummaryResponseDto,
    SubmissionResponseDto,
} from '@/assignments/assignments.response.dto';

/** Postgres unique-violation SQLSTATE. */
const UNIQUE_VIOLATION = '23505';

/**
 * Accepting an assignment and reading assignment state.
 *
 * Because students hold no GitHub credentials, this API is the entire
 * access-control boundary for their code (design §12). Ownership is resolved
 * here, once, and reused by every other service in the module.
 */
@Injectable()
export class AssignmentsService {
    private readonly logger = new Logger(AssignmentsService.name);

    constructor(
        @InjectRepository(Assignment)
        private readonly assignmentRepository: Repository<Assignment>,
        @InjectRepository(AssignmentSubmission)
        private readonly submissionRepository: Repository<AssignmentSubmission>,
        @InjectRepository(CIRun)
        private readonly ciRunRepository: Repository<CIRun>,
        @InjectRepository(CohortMembership)
        private readonly membershipRepository: Repository<CohortMembership>,
        private readonly dbTransactionService: DbTransactionService,
    ) {}

    /** Every assignment in every cohort the caller belongs to. */
    async listMyAssignments(
        user: User,
    ): Promise<AssignmentSummaryResponseDto[]> {
        const memberships = await this.membershipRepository.find({
            where: { user: { id: user.id } },
            relations: { cohort: true },
        });
        const cohortIds = memberships.map((m) => m.cohort.id);
        if (cohortIds.length === 0) return [];

        const assignments = await this.assignmentRepository.find({
            where: {
                cohortWeek: { cohort: { id: In(cohortIds) } },
                status: In([
                    AssignmentStatus.PUBLISHED,
                    AssignmentStatus.CLOSED,
                ]),
            },
            relations: { cohortWeek: { cohort: true } },
        });
        if (assignments.length === 0) return [];

        const submissions = await this.submissionRepository.find({
            where: {
                user: { id: user.id },
                assignment: { id: In(assignments.map((a) => a.id)) },
            },
            relations: {
                assignment: true,
                latestRun: true,
                bestRun: true,
            },
        });
        const byAssignment = new Map(
            submissions.map((s) => [s.assignment.id, s]),
        );

        return assignments
            .sort(
                (a, b) =>
                    b.cohortWeek.cohort.season - a.cohortWeek.cohort.season ||
                    a.cohortWeek.week - b.cohortWeek.week,
            )
            .map(
                (assignment) =>
                    new AssignmentSummaryResponseDto(
                        assignment,
                        byAssignment.get(assignment.id) ?? null,
                    ),
            );
    }

    async getAssignment(
        assignmentId: string,
        user: User,
    ): Promise<AssignmentDetailResponseDto> {
        const assignment = await this.loadAssignment(assignmentId);
        await this.assertCohortMember(assignment, user);

        const submission = await this.findSubmission(assignmentId, user.id);
        const runsToday = submission
            ? await this.countRunsToday(submission.id)
            : 0;

        return new AssignmentDetailResponseDto(
            assignment,
            submission,
            runsToday,
        );
    }

    /**
     * Creates the submission and queues repository provisioning. Returns the
     * existing submission on a repeat call — the unique constraint on
     * (assignment, user) is what makes a double-clicked Accept idempotent
     * rather than a second repository.
     */
    async accept(
        assignmentId: string,
        user: User,
    ): Promise<SubmissionResponseDto> {
        const assignment = await this.loadAssignment(assignmentId);
        await this.assertCohortMember(assignment, user);

        if (assignment.status !== AssignmentStatus.PUBLISHED) {
            throw new ForbiddenException(
                `This assignment is ${assignment.status.toLowerCase()} and cannot be accepted.`,
            );
        }
        if (assignment.isPastDeadline() && !assignment.allowLateSubmission) {
            throw new ForbiddenException(
                'The deadline for this assignment has passed.',
            );
        }

        const existing = await this.findSubmission(assignmentId, user.id);
        if (existing) return new SubmissionResponseDto(existing, assignmentId);

        try {
            const submission = await this.dbTransactionService.execute(
                async (manager) => {
                    const created = manager.create(AssignmentSubmission, {
                        assignment,
                        user,
                        acceptedAt: new Date(),
                    });
                    await manager.save(created);

                    const task =
                        new APITask<TaskType.PROVISION_ASSIGNMENT_REPO>();
                    task.type = TaskType.PROVISION_ASSIGNMENT_REPO;
                    task.data = { submissionId: created.id };
                    await manager.save(task);

                    return created;
                },
            );

            this.logger.log(
                `User ${user.id} accepted assignment ${assignment.slug}`,
            );
            return new SubmissionResponseDto(submission, assignmentId);
        } catch (error) {
            // Two concurrent Accepts: the loser reads the winner's row.
            if (
                error instanceof QueryFailedError &&
                (error.driverError as { code?: string })?.code ===
                    UNIQUE_VIOLATION
            ) {
                const raced = await this.findSubmission(assignmentId, user.id);
                if (raced) {
                    return new SubmissionResponseDto(raced, assignmentId);
                }
            }
            throw error;
        }
    }

    /**
     * Loads a submission and authorizes the viewer. The only two ways in are
     * owning it or being staff; there is no GitHub-side path around this.
     */
    async resolveSubmissionForViewer(
        submissionId: string,
        viewer: User,
    ): Promise<AssignmentSubmission> {
        const submission = await this.submissionRepository.findOne({
            where: { id: submissionId },
            relations: {
                user: true,
                assignment: { cohortWeek: { cohort: true } },
            },
        });
        if (!submission) {
            throw new NotFoundException('Submission not found');
        }

        const isOwner = submission.user.id === viewer.id;
        const isStaff = isAtLeastRole(viewer.role, UserRole.TEACHING_ASSISTANT);
        if (!isOwner && !isStaff) {
            throw new ForbiddenException(
                'You do not have access to this submission',
            );
        }

        return submission;
    }

    /** Runs dispatched since UTC midnight, for the per-day quota. */
    async countRunsToday(submissionId: string): Promise<number> {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        return this.ciRunRepository.count({
            where: {
                submission: { id: submissionId },
                dispatchedAt: MoreThanOrEqual(startOfDay),
            },
        });
    }

    async findSubmission(
        assignmentId: string,
        userId: string,
    ): Promise<AssignmentSubmission | null> {
        return this.submissionRepository.findOne({
            where: {
                assignment: { id: assignmentId },
                user: { id: userId },
            },
            relations: { user: true, latestRun: true, bestRun: true },
        });
    }

    private async loadAssignment(assignmentId: string): Promise<Assignment> {
        const assignment = await this.assignmentRepository.findOne({
            where: { id: assignmentId },
            relations: { cohortWeek: { cohort: true } },
        });
        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }
        return assignment;
    }

    /**
     * Staff can inspect any assignment; a student must be enrolled in the
     * cohort it belongs to.
     */
    private async assertCohortMember(
        assignment: Assignment,
        user: User,
    ): Promise<void> {
        if (isAtLeastRole(user.role, UserRole.TEACHING_ASSISTANT)) return;

        const membership = await this.membershipRepository.findOne({
            where: {
                user: { id: user.id },
                cohort: { id: assignment.cohortWeek.cohort.id },
            },
        });
        if (!membership) {
            throw new ForbiddenException('You are not enrolled in this cohort');
        }
    }
}
