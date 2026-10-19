import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Cohort } from '@/entities/cohort.entity';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { APITask } from '@/entities/api-task.entity';
import { TaskType } from '@/task-processor/task.enums';
import { SyncClassroomScoresTaskData } from '@/task-processor/task.types';
import { ServiceError } from '@/common/errors';
import { AssignmentBackend } from '@/common/enum';
import { GitHubClassroomClient } from '@/github-classroom/client/github-classroom.client';
import { AcceptedAssignment } from '@/github-classroom/client/response';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { isLastRetry } from '@/task-processor/task-processor.utils';
import {
    SIX_HOURS_MS,
    TWENTY_FOUR_HOURS_MS,
} from '@/common/durations.constants';

/** One week as GitHub Classroom reported it, read before any database write. */
interface ClassroomWeekResult {
    cohortWeekId: string;
    inviteLink: string;
    assignmentUrl: string;
    accepted: AcceptedAssignment[];
}

/**
 * A cohort's Classroom results, fetched and waiting to be applied. Fetching
 * is network-bound and slow, so it happens outside any transaction; applying
 * is quick and happens under the cohort row lock.
 */
export interface FetchedClassroomResults {
    cohortId: string;
    githubUsernameToUserId: Map<string, string>;
    weeks: ClassroomWeekResult[];
    // Weeks Classroom failed to report; their scores are left as they were.
    failedWeekIds: string[];
}

@Injectable()
export class GitHubClassroomService {
    private readonly logger = new Logger(GitHubClassroomService.name);

    constructor(
        @InjectRepository(APITask)
        private readonly apiTaskRepository: Repository<APITask<any>>,
        @InjectRepository(Cohort)
        private readonly cohortRepository: Repository<Cohort>,
        private readonly githubClassroomClient: GitHubClassroomClient,
        private readonly dbTransactionService: DbTransactionService,
    ) {}

    private async scheduleNextSync(
        data: SyncClassroomScoresTaskData,
    ): Promise<void> {
        // Re-read rather than trust the cohort this run loaded: a switch to the
        // in-house classroom may have committed mid-run, and the switch's task
        // cancellation cannot reach a task that is already running.
        const stillOnClassroom = await this.cohortRepository.exists({
            where: {
                id: data.cohortId,
                assignmentBackend: AssignmentBackend.CLASSROOM,
            },
        });
        if (!stillOnClassroom) {
            this.logger.debug(
                `Cohort (${data.cohortId}) is no longer on GitHub Classroom, not rescheduling sync`,
            );
            return;
        }

        const entity = this.apiTaskRepository.create({
            type: TaskType.SYNC_CLASSROOM_SCORES,
            data: data,
            executeOnTime: new Date(Date.now() + SIX_HOURS_MS),
        });
        await this.apiTaskRepository.save(entity);
    }

    async handleSyncClassroomTask(
        task: APITask<TaskType.SYNC_CLASSROOM_SCORES>,
    ): Promise<void> {
        const data: SyncClassroomScoresTaskData = task.data;
        try {
            const shouldReschedule = await this.syncCohortScoresById(
                data.cohortId,
            );

            if (shouldReschedule) await this.scheduleNextSync(data);
        } catch (error) {
            this.logger.error(
                `Failed to sync classroom scores for cohort (${
                    data.cohortId
                }): ${error?.message ?? error}`,
                error?.stack,
            );

            if (isLastRetry(task)) {
                await this.scheduleNextSync(data);
            }

            throw error;
        }
    }

    private async syncCohortScoresById(cohortId: string): Promise<boolean> {
        const cohort = await this.loadCohort(cohortId);

        // A switched cohort keeps its classroomId as history, so that check
        // alone would let Classroom overwrite the in-house scores.
        if (cohort.assignmentBackend !== AssignmentBackend.CLASSROOM) {
            this.logger.debug(
                `Cohort (${cohort.id}) is not on GitHub Classroom, skipping sync`,
            );
            return false;
        }

        const endDatePlusBuffer = new Date(
            cohort.getEndDate().getTime() + TWENTY_FOUR_HOURS_MS,
        );
        const hasCohortEnded = endDatePlusBuffer < new Date();

        if (!cohort.classroomId) {
            this.logger.log(
                `No classroomId set for cohort (${cohort.id}), skipping`,
            );
            return false;
        }

        const fetched = await this.fetchResults(cohort, { strict: false });
        if (fetched.weeks.length === 0 && fetched.failedWeekIds.length === 0) {
            // If the cohort has ended, we can stop scheduling syncs.
            // If it hasn't ended, we keep scheduling in case assignments or
            // users are added later.
            return !hasCohortEnded;
        }

        const applied = await this.dbTransactionService.execute(
            async (manager) => {
                // The backend was checked before a fetch that can take
                // minutes; a switch may have committed since. Re-read it under
                // the lock the switch also takes, so either the switch waits
                // for these writes and freezes them, or this run sees INHOUSE
                // and writes nothing over the in-house scores.
                const locked = await manager.findOne(Cohort, {
                    where: { id: cohort.id },
                    // FOR NO KEY UPDATE, not FOR UPDATE: it still serialises
                    // against the switch's update, but does not block the
                    // foreign-key checks of students joining meanwhile.
                    lock: { mode: 'for_no_key_update' },
                });
                if (locked?.assignmentBackend !== AssignmentBackend.CLASSROOM) {
                    return null;
                }
                return this.applyResults(manager, fetched, { strict: false });
            },
        );
        if (applied === null) {
            this.logger.log(
                `Cohort (${cohort.id}) left GitHub Classroom during the sync; discarded its results`,
            );
            return false;
        }

        this.logger.log(
            `Cohort (${cohort.id}) sync complete: ${applied.syncedWeeks} succeeded, ${applied.failedWeeks + fetched.failedWeekIds.length} failed`,
        );

        // If the cohort has ended, we can stop scheduling syncs.
        // If it hasn't ended, we keep scheduling in case of late submissions or new assignments.
        return !hasCohortEnded;
    }

    /**
     * The switch to the in-house classroom's drain step, part one: read every
     * week's final results from Classroom, before the switch's transaction.
     * Strict: a week Classroom cannot report fails the whole read, because the
     * switch would otherwise freeze that week's stale scores for good.
     */
    async fetchFinalResults(
        cohortId: string,
    ): Promise<FetchedClassroomResults> {
        const cohort = await this.loadCohort(cohortId);
        return this.fetchResults(cohort, { strict: true });
    }

    /**
     * Part two: write those results inside the switch's transaction, which
     * holds the cohort row lock, so no periodic sync can interleave. Strict
     * for the same reason as the fetch. Returns how many scores it wrote.
     */
    async applyFinalResults(
        manager: EntityManager,
        fetched: FetchedClassroomResults,
    ): Promise<number> {
        const { scoresWritten } = await this.applyResults(manager, fetched, {
            strict: true,
        });
        return scoresWritten;
    }

    private async loadCohort(cohortId: string): Promise<Cohort> {
        const cohort = await this.cohortRepository.findOne({
            where: { id: cohortId },
            relations: {
                memberships: { user: true },
                weeks: true,
            },
        });

        if (!cohort) {
            throw new ServiceError(
                `Cohort with ID ${cohortId} not found. Cannot sync GitHub Classroom scores.`,
            );
        }
        return cohort;
    }

    private async fetchResults(
        cohort: Cohort,
        { strict }: { strict: boolean },
    ): Promise<FetchedClassroomResults> {
        const fetched: FetchedClassroomResults = {
            cohortId: cohort.id,
            githubUsernameToUserId: new Map(),
            weeks: [],
            failedWeekIds: [],
        };

        const weeksWithAssignment = cohort.weeks.filter(
            (w) => w.classroomAssignmentId,
        );
        if (weeksWithAssignment.length === 0) {
            this.logger.log(
                `No weeks with classroomAssignmentId in cohort (${cohort.id}), skipping sync`,
            );
            return fetched;
        }

        for (const membership of cohort.memberships) {
            const user = membership.user;
            const username = this.extractGitHubUsername(user.githubProfileUrl);
            if (username) {
                fetched.githubUsernameToUserId.set(
                    username.toLowerCase(),
                    user.id,
                );
            }
        }

        if (fetched.githubUsernameToUserId.size === 0) {
            this.logger.warn(
                `No users with GitHub profiles in cohort (${cohort.id})`,
            );
            return fetched;
        }

        this.logger.log(
            `Syncing cohort (${cohort.id}) — ${fetched.githubUsernameToUserId.size} GitHub-linked user(s), ${weeksWithAssignment.length} assignment(s)`,
        );

        for (const cohortWeek of weeksWithAssignment) {
            const assignmentId = parseInt(cohortWeek.classroomAssignmentId!);
            try {
                const assignment =
                    await this.githubClassroomClient.getAssignment(
                        assignmentId,
                    );
                const accepted =
                    await this.githubClassroomClient.fetchAcceptedAssignments(
                        assignmentId,
                    );
                fetched.weeks.push({
                    cohortWeekId: cohortWeek.id,
                    inviteLink: assignment.invite_link,
                    assignmentUrl: `${assignment.classroom.url}/assignments/${assignment.slug}`,
                    accepted,
                });
            } catch (error) {
                if (strict) {
                    throw new ServiceError(
                        `GitHub Classroom could not report week ${cohortWeek.week}: ${error.message}`,
                    );
                }
                fetched.failedWeekIds.push(cohortWeek.id);
                this.logger.error(
                    `Failed to sync cohort week (${cohortWeek.id}): ${error.message}`,
                    error.stack,
                );
            }
        }

        return fetched;
    }

    private async applyResults(
        manager: EntityManager,
        fetched: FetchedClassroomResults,
        { strict }: { strict: boolean },
    ): Promise<{
        syncedWeeks: number;
        failedWeeks: number;
        scoresWritten: number;
    }> {
        let syncedWeeks = 0;
        let failedWeeks = 0;
        let scoresWritten = 0;

        for (const week of fetched.weeks) {
            try {
                scoresWritten += await this.applyWeek(manager, fetched, week);
                syncedWeeks++;
            } catch (error) {
                if (strict) throw error;
                failedWeeks++;
                this.logger.error(
                    `Failed to sync cohort week (${week.cohortWeekId}): ${error.message}`,
                    error.stack,
                );
            }
        }

        return { syncedWeeks, failedWeeks, scoresWritten };
    }

    // Validates the whole week before writing any of it, so a week that fails
    // leaves nothing half-written in the shared transaction.
    private async applyWeek(
        manager: EntityManager,
        fetched: FetchedClassroomResults,
        week: ClassroomWeekResult,
    ): Promise<number> {
        const existingScores = await manager.find(ExerciseScore, {
            where: {
                cohort: { id: fetched.cohortId },
                cohortWeek: { id: week.cohortWeekId },
            },
            relations: {
                user: true,
            },
        });

        const userIdToScoreMap = new Map<string, ExerciseScore>();
        for (const score of existingScores) {
            userIdToScoreMap.set(score.user.id, score);
        }

        const scoresToSave: ExerciseScore[] = [];
        const unmatchedLogins: string[] = [];

        for (const acceptedAssignment of week.accepted) {
            for (const student of acceptedAssignment.students) {
                const userId = fetched.githubUsernameToUserId.get(
                    student.login.toLowerCase(),
                );
                if (!userId) {
                    unmatchedLogins.push(student.login);
                    continue;
                }

                const score = userIdToScoreMap.get(userId);
                if (!score) {
                    throw new ServiceError(
                        `No ExerciseScore found for user ID (${userId}) for cohort week (${week.cohortWeekId})`,
                    );
                }

                // We use commit_count > 0 instead of 'submitted' because of a Github Classroom quirk
                // where it may not mark an assignment as 'submitted' even if the student has accepted and pushed to the repo
                score.isSubmitted = acceptedAssignment.commit_count > 0;
                score.isPassing = acceptedAssignment.passing;
                score.classroomRepositoryUrl =
                    acceptedAssignment.repository.html_url;
                scoresToSave.push(score);
            }
        }

        await manager.update(CohortWeek, week.cohortWeekId, {
            classroomInviteLink: week.inviteLink,
            classroomAssignmentUrl: week.assignmentUrl,
        });

        if (unmatchedLogins.length > 0) {
            this.logger.warn(
                `Cohort week (${week.cohortWeekId}) has ${
                    unmatchedLogins.length
                } unmatched GitHub student(s): ${unmatchedLogins.join(', ')}`,
            );
        }

        if (scoresToSave.length > 0) {
            await manager.save(scoresToSave);
            this.logger.log(
                `Updated ${scoresToSave.length} exercise score(s) for cohort week (${week.cohortWeekId})`,
            );
        }
        return scoresToSave.length;
    }

    private extractGitHubUsername(profileUrl: string | null): string | null {
        if (!profileUrl) return null;
        try {
            const { hostname, pathname } = new URL(profileUrl);
            if (hostname !== 'github.com') return null;
            const segments = pathname.split('/').filter(Boolean);
            return segments.length > 0 ? segments[0] : null;
        } catch {
            return null;
        }
    }
}
