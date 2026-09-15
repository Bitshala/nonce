import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from 'typeorm';
import { ExerciseScoreWritebackService } from '@/assignments/exercise-score-writeback.service';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { ServiceError } from '@/common/errors';

// This service is the only thing that writes the two booleans the leaderboard
// and certificates read. The invariant worth pinning is that it re-reads the
// submission itself: an unloaded `bestRun` relation is indistinguishable from
// "never passed", so trusting the caller's object would silently un-pass
// students on every save.
describe('ExerciseScoreWritebackService — sync', () => {
    let service: ExerciseScoreWritebackService;
    const manager = { findOne: jest.fn(), save: jest.fn() };

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

        await expect(
            service.sync(manager as unknown as EntityManager, 'submission-1'),
        ).rejects.toBeInstanceOf(ServiceError);
        expect(manager.save).not.toHaveBeenCalled();
    });

    it('throws when the submission has gone', async () => {
        manager.findOne.mockResolvedValueOnce(null);

        await expect(
            service.sync(manager as unknown as EntityManager, 'missing'),
        ).rejects.toBeInstanceOf(ServiceError);
    });
});
