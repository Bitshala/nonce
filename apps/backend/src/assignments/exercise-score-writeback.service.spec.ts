import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from 'typeorm';
import { ExerciseScoreWritebackService } from '@/assignments/exercise-score-writeback.service';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { ServiceError } from '@/common/errors';
import { AssignmentBackend } from '@/common/enum';

// This service is the only thing that writes the two booleans the leaderboard
// and certificates read. The invariant worth pinning is that it re-reads the
// submission itself: an unloaded `bestRun` relation is indistinguishable from
// "never passed", so trusting the caller's object would silently un-pass
// students on every save.
describe('ExerciseScoreWritebackService — sync', () => {
    let service: ExerciseScoreWritebackService;
    const manager = { findOne: jest.fn(), save: jest.fn(), exists: jest.fn() };

    const buildSubmission = (
        overrides: Partial<AssignmentSubmission> = {},
    ): AssignmentSubmission =>
        ({
            id: 'submission-1',
            user: { id: 'user-1' },
            repoOwner: 'bitshala',
            repoName: 'pb-week-3-s4-user-1',
            initialCommitSha: 'a'.repeat(40),
            lastCommitSha: 'b'.repeat(40),
            bestRun: null,
            assignment: {
                cohortWeek: { id: 'week-1', cohort: { id: 'cohort-1' } },
            },
            get hasStudentCommits() {
                return (
                    this.lastCommitSha !== null &&
                    this.lastCommitSha !== this.initialCommitSha
                );
            },
            get repoFullName() {
                return `${this.repoOwner}/${this.repoName}`;
            },
            get repoHtmlUrl() {
                return `https://github.com/${this.repoFullName}`;
            },
            ...overrides,
        }) as unknown as AssignmentSubmission;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ExerciseScoreWritebackService],
        }).compile();
        service = module.get(ExerciseScoreWritebackService);
    });

    afterEach(() => jest.resetAllMocks());

    const runSync = async (
        submission: AssignmentSubmission,
        score: Partial<ExerciseScore> = {},
    ) => {
        const row = { isSubmitted: false, isPassing: false, ...score };
        manager.findOne
            .mockResolvedValueOnce(submission)
            .mockResolvedValueOnce(row);

        await service.sync(manager as unknown as EntityManager, 'submission-1');
        return row;
    };

    it('marks a submission with commits beyond the template as submitted', async () => {
        const row = await runSync(buildSubmission());

        expect(row.isSubmitted).toBe(true);
        expect(row.isPassing).toBe(false);
        expect(manager.save).toHaveBeenCalledWith(row);
    });

    it('does not count the template’s own initial commit as work', async () => {
        const sha = 'a'.repeat(40);
        const row = await runSync(
            buildSubmission({ initialCommitSha: sha, lastCommitSha: sha }),
        );

        expect(row.isSubmitted).toBe(false);
    });

    it('marks passing once a best run exists', async () => {
        const row = await runSync(
            buildSubmission({ bestRun: { id: 'run-1' } as never }),
        );

        expect(row.isPassing).toBe(true);
    });

    it('lets a staff pin win over grading, field by field', async () => {
        // Commits and a best run say submitted and passing; the pins say
        // otherwise, and a manual call has to survive the next save or run.
        const row = await runSync(
            buildSubmission({
                bestRun: { id: 'run-1' } as never,
                isSubmittedOverride: false,
                isPassingOverride: false,
            }),
        );

        expect(row.isSubmitted).toBe(false);
        expect(row.isPassing).toBe(false);
    });

    it('can pin a pass that grading never gave', async () => {
        const row = await runSync(buildSubmission({ isPassingOverride: true }));

        expect(row.isPassing).toBe(true);
    });

    it('follows grading for a field whose pin is null', async () => {
        const row = await runSync(
            buildSubmission({
                bestRun: { id: 'run-1' } as never,
                isSubmittedOverride: null,
                isPassingOverride: null,
            }),
        );

        expect(row.isSubmitted).toBe(true);
        expect(row.isPassing).toBe(true);
    });

    it('records the repository url the same way the Classroom sync did', async () => {
        const row = (await runSync(buildSubmission())) as ExerciseScore;

        expect(row.classroomRepositoryUrl).toBe(
            'https://github.com/bitshala/pb-week-3-s4-user-1',
        );
    });

    it('reads bestRun from its own query, not from the caller’s object', async () => {
        // The caller passes only an id, so a service that trusted a passed-in
        // entity would see no bestRun here and clear a legitimate pass.
        manager.findOne
            .mockResolvedValueOnce(
                buildSubmission({ bestRun: { id: 'run-1' } as never }),
            )
            .mockResolvedValueOnce({ isSubmitted: true, isPassing: true });

        await service.sync(manager as unknown as EntityManager, 'submission-1');

        const [submissionQuery] = manager.findOne.mock.calls[0];
        expect(submissionQuery).toBe(AssignmentSubmission);
        expect(manager.findOne.mock.calls[0][1].relations).toEqual(
            expect.objectContaining({ bestRun: true }),
        );
    });

    it('throws rather than inventing a score row that enrollment should have seeded', async () => {
        manager.findOne
            .mockResolvedValueOnce(buildSubmission())
            .mockResolvedValueOnce(null);
        manager.exists.mockResolvedValueOnce(true);

        await expect(
            service.sync(manager as unknown as EntityManager, 'submission-1'),
        ).rejects.toBeInstanceOf(ServiceError);
        expect(manager.save).not.toHaveBeenCalled();
    });

    it('writes nothing for staff, who can run an assignment without being enrolled', async () => {
        // Throwing here would roll back the run's own completion, leaving a
        // staff member's test run stuck in progress forever.
        manager.findOne
            .mockResolvedValueOnce(buildSubmission())
            .mockResolvedValueOnce(null);
        manager.exists.mockResolvedValueOnce(false);

        await expect(
            service.sync(manager as unknown as EntityManager, 'submission-1'),
        ).resolves.toBeUndefined();
        expect(manager.save).not.toHaveBeenCalled();
    });

    it('throws when the submission has gone', async () => {
        manager.findOne.mockResolvedValueOnce(null);

        await expect(
            service.sync(manager as unknown as EntityManager, 'missing'),
        ).rejects.toBeInstanceOf(ServiceError);
    });
    // A cohort GitHub Classroom graded before it switched keeps those results
    // on its rows. A student's first in-house save has no passing run behind
    // it, so the native rule would wipe a Classroom pass — and after the
    // deadline no run could ever restore it.
    describe('on a cohort switched from GitHub Classroom', () => {
        const switched = (
            overrides: Partial<AssignmentSubmission> = {},
            deadline: Date | null = new Date(Date.now() + 86_400_000),
        ) =>
            buildSubmission({
                assignment: {
                    deadline,
                    cohortWeek: {
                        id: 'week-1',
                        cohort: {
                            id: 'cohort-1',
                            assignmentBackend: AssignmentBackend.INHOUSE,
                            classroomId: '243620',
                        },
                    },
                } as never,
                ...overrides,
            });
        const classroomPass = {
            isSubmitted: true,
            isPassing: true,
            classroomRepositoryUrl: 'https://github.com/classroom/week-1-alice',
        };

        it('keeps a Classroom pass when the student saves without a passing run', async () => {
            const row = await runSync(switched(), classroomPass);

            expect(row.isPassing).toBe(true);
            expect(row.isSubmitted).toBe(true);
        });

        it('keeps a Classroom pass after graduation, when no run can count', async () => {
            // Past the deadline runs do not count, so bestRun stays null.
            const row = await runSync(
                switched({}, new Date(Date.now() - 86_400_000)),
                classroomPass,
            );

            expect(row.isPassing).toBe(true);
        });

        it('raises a Classroom fail once an in-house run passes', async () => {
            const row = await runSync(
                switched({ bestRun: { id: 'run-1' } as never }),
                { isSubmitted: true, isPassing: false },
            );

            expect(row.isPassing).toBe(true);
        });

        it('still lets a staff pin lower a Classroom result', async () => {
            const row = await runSync(
                switched({
                    isPassingOverride: false,
                    isSubmittedOverride: false,
                }),
                classroomPass,
            );

            expect(row.isPassing).toBe(false);
            expect(row.isSubmitted).toBe(false);
        });

        it('does not un-submit a week the student pushed to in Classroom', async () => {
            const sha = 'a'.repeat(40);
            const row = await runSync(
                switched({ initialCommitSha: sha, lastCommitSha: sha }),
                { isSubmitted: true, isPassing: false },
            );

            expect(row.isSubmitted).toBe(true);
        });

        it('keeps the Classroom repository url rather than overwriting it', async () => {
            const row = (await runSync(
                switched(),
                classroomPass,
            )) as ExerciseScore;

            expect(row.classroomRepositoryUrl).toBe(
                'https://github.com/classroom/week-1-alice',
            );
        });

        it('never clears the repository url', async () => {
            const row = (await runSync(
                switched({ repoHtmlUrl: null } as never),
                classroomPass,
            )) as ExerciseScore;

            expect(row.classroomRepositoryUrl).toBe(
                'https://github.com/classroom/week-1-alice',
            );
        });

        it('records the in-house repository for a week Classroom never saw', async () => {
            const row = (await runSync(switched(), {
                classroomRepositoryUrl: null,
            })) as ExerciseScore;

            expect(row.classroomRepositoryUrl).toBe(
                'https://github.com/bitshala/pb-week-3-s4-user-1',
            );
        });
    });

    it('follows grading alone on a native in-house cohort, even down', async () => {
        // No classroomId: nothing Classroom-derived to protect, so today's
        // rule applies unchanged.
        const row = (await runSync(
            buildSubmission({
                assignment: {
                    cohortWeek: {
                        id: 'week-1',
                        cohort: {
                            id: 'cohort-1',
                            assignmentBackend: AssignmentBackend.INHOUSE,
                            classroomId: null,
                        },
                    },
                } as never,
            }),
            {
                isSubmitted: true,
                isPassing: true,
                classroomRepositoryUrl: 'https://github.com/old/url',
            },
        )) as ExerciseScore;

        expect(row.isPassing).toBe(false);
        expect(row.classroomRepositoryUrl).toBe(
            'https://github.com/bitshala/pb-week-3-s4-user-1',
        );
    });
});
