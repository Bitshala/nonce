import {
    Assignment,
    DEFAULT_PROTECTED_PATHS,
} from '@/entities/assignment.entity';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { AssignmentConfig } from '@/cohorts/cohorts.config.model';
import { AssignmentDeadlineSource, AssignmentStatus } from '@/common/enum';

/** The single workflow in the grader repo that every assignment runs through. */
export const DEFAULT_GRADER_WORKFLOW_PATH = '.github/workflows/grade.yml';

/**
 * Assignments are authored in the cohort config, not in an admin UI, so this is
 * the one place config turns into an `Assignment` row. Shared by cohort
 * creation and by the admin re-sync endpoint, which is what lets a config typo
 * be fixed without recreating the cohort.
 *
 * Mutates and returns `assignment` so callers can use it for both insert and
 * update.
 */
export function applyAssignmentConfig(
    assignment: Assignment,
    config: AssignmentConfig,
    week: CohortWeek,
    season: number,
): Assignment {
    assignment.cohortWeek = week;
    // The season disambiguates repos when a student takes the same cohort
    // twice; without it `<slug>-<userId>` would collide.
    assignment.slug = `${config.slug}-s${season}`;
    assignment.templateOwner = config.templateOwner;
    assignment.templateRepo = config.templateRepo;
    assignment.templateRef = config.templateRef ?? null;
    assignment.graderWorkflowPath =
        config.graderWorkflowPath ?? DEFAULT_GRADER_WORKFLOW_PATH;
    assignment.graderTestPath = config.graderTestPath;
    assignment.status = AssignmentStatus.PUBLISHED;
    assignment.deadlineSource = resolveDeadlineSource(config);
    assignment.deadlineDaysAfterWeek = config.deadlineDaysAfterWeek ?? null;
    // Left as it was for GRADUATION: the graduation date is a property of the
    // cohort's weeks, which this function is not given. CohortsService fills it
    // in via syncAssignmentDeadlines once the weeks are saved.
    if (assignment.deadlineSource !== AssignmentDeadlineSource.GRADUATION) {
        assignment.deadline = resolveDeadline(
            assignment.deadlineSource,
            week.scheduledDate,
            null,
            config.deadlineDaysAfterWeek,
        );
    }
    assignment.allowLateSubmission = config.allowLateSubmission ?? true;
    assignment.protectedPaths = config.protectedPaths ?? [
        ...DEFAULT_PROTECTED_PATHS,
    ];
    assignment.maxRunsPerDay = config.maxRunsPerDay ?? 50;
    assignment.runTimeoutMinutes = config.runTimeoutMinutes ?? 10;
    return assignment;
}

function resolveDeadlineSource(
    config: AssignmentConfig,
): AssignmentDeadlineSource {
    if (config.deadline === 'GRADUATION') {
        return AssignmentDeadlineSource.GRADUATION;
    }
    if (config.deadlineDaysAfterWeek !== undefined) {
        return AssignmentDeadlineSource.WEEK_OFFSET;
    }
    return AssignmentDeadlineSource.NONE;
}

/**
 * Turn a deadline rule into a date.
 *
 * Deadlines are relative in config and absolute in the database, because the
 * same config seeds every season — and because a cohort's dates can be moved
 * after it exists, which is why this is callable again later rather than only
 * at seed time. Lands on end-of-day IST, matching how `registrationDeadline` is
 * normalised at cohort creation.
 *
 * `graduationDate` may be null when the caller does not have the cohort's weeks
 * to hand; a GRADUATION assignment then keeps whatever deadline it already had
 * rather than silently losing one.
 */
export function resolveDeadline(
    source: AssignmentDeadlineSource,
    weekScheduledDate: Date,
    graduationDate: Date | null,
    daysAfterWeek: number | null | undefined,
): Date | null {
    let deadline: Date;

    switch (source) {
        case AssignmentDeadlineSource.NONE:
            return null;
        case AssignmentDeadlineSource.GRADUATION:
            if (!graduationDate) return null;
            deadline = new Date(graduationDate);
            break;
        case AssignmentDeadlineSource.WEEK_OFFSET:
            if (daysAfterWeek === null || daysAfterWeek === undefined) {
                return null;
            }
            deadline = new Date(weekScheduledDate);
            deadline.setUTCDate(deadline.getUTCDate() + daysAfterWeek);
            break;
    }

    // 23:59:59.999 IST = 18:29:59.999 UTC
    deadline.setUTCHours(18, 29, 59, 999);
    return deadline;
}
