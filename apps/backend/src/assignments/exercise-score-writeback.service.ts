import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { CohortMembership } from '@/entities/cohort-membership.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { ClassroomResultSnapshot } from '@/entities/classroom-result-snapshot.entity';
import { isSwitchedFromClassroom } from '@/entities/cohort.entity';
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
            // The exception is staff, who can accept and run an assignment to
            // try it without being enrolled — there is no score to write.
            const enrolled = await manager.exists(CohortMembership, {
                where: {
                    user: { id: submission.user.id },
                    cohort: { id: cohort.id },
                },
            });
            if (!enrolled) {
                this.logger.log(
                    `Submission ${submission.id} belongs to a user outside cohort ${cohort.id}; no score to write`,
                );
                return;
            }
            throw new ServiceError(
                `No ExerciseScore for user ${submission.user.id}, cohort ${cohort.id}, week ${week.id}`,
            );
        }

        if (isSwitchedFromClassroom(cohort)) {
            // Classroom graded this week before the cohort switched, and its
            // result is frozen in the snapshot. In-house work may add to it but
            // never take it away: a save with no passing run yet must not undo
            // a Classroom pass, which after the deadline no run could restore.
            // A staff pin still wins either way.
            //
            // The baseline is the snapshot, never this row's current value:
            // the row also holds whatever a pin last wrote, so ORing onto it
            // would turn a cleared pin into a permanent one, in either
            // direction. A student who joined after the switch has no snapshot.
            const snapshot = await manager.findOne(ClassroomResultSnapshot, {
                where: {
                    user: { id: submission.user.id },
                    cohortWeek: { id: week.id },
                },
            });
            const passedInHouse = submission.bestRun != null;
            score.isSubmitted =
                submission.isSubmittedOverride ??
                (submission.hasStudentCommits ||
                    (snapshot?.isSubmitted ?? false));
            score.isPassing =
                submission.isPassingOverride ??
                (passedInHouse || (snapshot?.isPassing ?? false));
            // The evidence is the repo that produced the result: the in-house
            // one once it passes, otherwise the Classroom one if there was any.
            score.classroomRepositoryUrl =
                (passedInHouse ? submission.repoHtmlUrl : null) ??
                snapshot?.classroomRepositoryUrl ??
                submission.repoHtmlUrl;
        } else {
            // A staff pin wins, field by field; without one, grading decides.
            score.isSubmitted =
                submission.isSubmittedOverride ?? submission.hasStudentCommits;
            // bestRun is the first score-eligible run that passed, and is never
            // cleared — breaking your code after passing does not un-pass you.
            score.isPassing =
                submission.isPassingOverride ?? submission.bestRun != null;
            score.classroomRepositoryUrl = submission.repoHtmlUrl;
        }

        await manager.save(score);

        this.logger.log(
            `Synced ExerciseScore for submission ${submission.id}: submitted=${score.isSubmitted} passing=${score.isPassing}`,
        );
    }

    /**
     * Puts a switched cohort's frozen Classroom results back on a student's
     * freshly seeded score rows. Removal deletes those rows, and on a switched
     * cohort no Classroom sync will ever refill them, so without this a
     * student removed and added back would lose every Classroom pass.
     *
     * Covers every week, including ones with no in-house submission, which
     * `sync` never visits. Call it before replaying submissions through
     * `sync`, which then raises the weeks with in-house work.
     */
    async restoreClassroomResults(
        manager: EntityManager,
        userId: string,
        cohortId: string,
    ): Promise<void> {
        const snapshots = await manager.find(ClassroomResultSnapshot, {
            where: { user: { id: userId }, cohort: { id: cohortId } },
            relations: { cohortWeek: true },
        });
        if (snapshots.length === 0) return;

        const scores = await manager.find(ExerciseScore, {
            where: { user: { id: userId }, cohort: { id: cohortId } },
            relations: { cohortWeek: true },
        });
        const byWeekId = new Map(
            snapshots.map((snap) => [snap.cohortWeek.id, snap] as const),
        );

        const restored: ExerciseScore[] = [];
        for (const score of scores) {
            const snapshot = byWeekId.get(score.cohortWeek.id);
            if (!snapshot) continue;
            score.isSubmitted = snapshot.isSubmitted;
            score.isPassing = snapshot.isPassing;
            score.classroomRepositoryUrl = snapshot.classroomRepositoryUrl;
            restored.push(score);
        }
        if (restored.length > 0) await manager.save(restored);

        this.logger.log(
            `Restored ${restored.length} Classroom result(s) for user ${userId} in cohort ${cohortId}`,
        );
    }
}
