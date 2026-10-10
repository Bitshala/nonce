import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AssignmentsService } from '@/assignments/assignments.service';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { Assignment } from '@/entities/assignment.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { CIRun } from '@/entities/ci-run.entity';
import { CohortMembership } from '@/entities/cohort-membership.entity';
import { User } from '@/entities/user.entity';
import { AssignmentStatus, UserRole } from '@/common/enum';

// This service is the whole access-control boundary for student code: nobody
// holds GitHub credentials for the repos, so whatever it lets through, it lets
// through for good.
describe('AssignmentsService', () => {
    let service: AssignmentsService;

    const assignmentRepository = { findOne: jest.fn() };
    const submissionRepository = { findOne: jest.fn() };
    const ciRunRepository = { count: jest.fn() };
    const membershipRepository = { findOne: jest.fn() };

    const student = { id: 'student-1', role: UserRole.STUDENT } as User;
    const staff = { id: 'ta-1', role: UserRole.TEACHING_ASSISTANT } as User;

    const submission = (ownerId: string) =>
        Object.assign(new AssignmentSubmission(), {
            id: 'submission-1',
            user: { id: ownerId },
            assignment: Object.assign(new Assignment(), {
                id: 'assignment-1',
                cohortWeek: { cohort: { id: 'cohort-1' } },
            }),
        });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AssignmentsService,
                {
                    provide: getRepositoryToken(Assignment),
                    useValue: assignmentRepository,
                },
                {
                    provide: getRepositoryToken(AssignmentSubmission),
                    useValue: submissionRepository,
                },
                {
                    provide: getRepositoryToken(CIRun),
                    useValue: ciRunRepository,
                },
                {
                    provide: getRepositoryToken(CohortMembership),
                    useValue: membershipRepository,
                },
                { provide: DbTransactionService, useValue: {} },
            ],
        }).compile();
        service = module.get(AssignmentsService);
    });

    afterEach(() => jest.resetAllMocks());

    describe('resolveSubmissionForViewer', () => {
        it('lets an enrolled owner in', async () => {
            submissionRepository.findOne.mockResolvedValue(
                submission(student.id),
            );
            membershipRepository.findOne.mockResolvedValue({ id: 'm-1' });

            await expect(
                service.resolveSubmissionForViewer('submission-1', student),
            ).resolves.toEqual(expect.objectContaining({ id: 'submission-1' }));
        });

        it('shuts out an owner who has been removed from the cohort', async () => {
            // Removal keeps the submission row, so ownership alone would let a
            // withdrawn student keep saving and running through the API.
            submissionRepository.findOne.mockResolvedValue(
                submission(student.id),
            );
            membershipRepository.findOne.mockResolvedValue(null);

            await expect(
                service.resolveSubmissionForViewer('submission-1', student),
            ).rejects.toThrow(ForbiddenException);
            expect(membershipRepository.findOne).toHaveBeenCalledWith({
                where: {
                    user: { id: student.id },
                    cohort: { id: 'cohort-1' },
                },
            });
        });

        it('lets staff in without a membership', async () => {
            submissionRepository.findOne.mockResolvedValue(
                submission(student.id),
            );

            await expect(
                service.resolveSubmissionForViewer('submission-1', staff),
            ).resolves.toBeDefined();
            expect(membershipRepository.findOne).not.toHaveBeenCalled();
        });

        it('refuses another student outright', async () => {
            submissionRepository.findOne.mockResolvedValue(
                submission('someone-else'),
            );

            await expect(
                service.resolveSubmissionForViewer('submission-1', student),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('reading and accepting an unpublished assignment', () => {
        const draft = () =>
            Object.assign(new Assignment(), {
                id: 'assignment-1',
                status: AssignmentStatus.DRAFT,
                cohortWeek: {
                    id: 'week-1',
                    week: 1,
                    cohort: { id: 'cohort-1', type: 'PB', season: 4 },
                },
            });

        beforeEach(() => {
            assignmentRepository.findOne.mockResolvedValue(draft());
            membershipRepository.findOne.mockResolvedValue({ id: 'm-1' });
            submissionRepository.findOne.mockResolvedValue(null);
        });

        it('hides a draft brief from an enrolled student', async () => {
            await expect(
                service.getAssignment('assignment-1', student),
            ).rejects.toThrow(NotFoundException);
        });

        it('answers accept on a draft the same way as a missing id', async () => {
            await expect(
                service.accept('assignment-1', student),
            ).rejects.toThrow(NotFoundException);
        });

        it('still shows a draft to staff', async () => {
            await expect(
                service.getAssignment('assignment-1', staff),
            ).resolves.toEqual(
                expect.objectContaining({ status: AssignmentStatus.DRAFT }),
            );
        });
    });
});
