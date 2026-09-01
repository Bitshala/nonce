import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { ServiceError } from '@/common/errors';

/**
 * Writes the in-house classroom's results onto `ExerciseScore`.
 *
 * This is the whole integration surface with scoring. `totalScore`,
 * `scaledScore`, the leaderboard, and certificates all read the same three
 * fields the Classroom sync writes today — this project changes how they get
 * set, not what they mean.
 */
@Injectable()
export class ExerciseScoreWritebackService {
    private readonly logger = new Logger(ExerciseScoreWritebackService.name);

    /**
     * Re-reads the submission inside the caller's transaction rather than
     * trusting whatever relations they happened to load. Getting that wrong
     * would silently clear `isPassing` — an unloaded `bestRun` is
     * indistinguishable from "never passed" — so it is not left to call sites.
     */
    async sync(manager: EntityManager, submissionId: string): Promise<void> {
        const submission = await manager.findOne(AssignmentSubmission, {
            where: { id: submissionId },
            relations: {
                user: true,
                bestRun: true,
                assignment: { cohortWeek: { cohort: true } },
            },
        });
        if (!submission) {
            throw new ServiceError(
                `Submission ${submissionId} not found during score writeback`,
            );
        }

        const week = submission.assignment.cohortWeek;
        const cohort = week.cohort;

        const score = await manager.findOne(ExerciseScore, {
            where: {
                user: { id: submission.user.id },
                cohort: { id: cohort.id },
                cohortWeek: { id: week.id },
            },
        });

        // Rows are seeded for every exercise week when a student joins a cohort,
        // so a missing one means the enrollment data is wrong, not that we
        // should invent a score. Same stance the Classroom sync takes.
        if (!score) {
            throw new ServiceError(
                `No ExerciseScore for user ${submission.user.id}, cohort ${cohort.id}, week ${week.id}`,
            );
        }

        score.isSubmitted = submission.hasStudentCommits;
        // bestRun is the first score-eligible run that passed, and is never
        // cleared — breaking your code after passing does not un-pass you.
        score.isPassing = submission.bestRun != null;
        score.classroomRepositoryUrl = submission.repoHtmlUrl;

        await manager.save(score);

        this.logger.log(
            `Synced ExerciseScore for submission ${submission.id}: submitted=${score.isSubmitted} passing=${score.isPassing}`,
        );
    }
}
