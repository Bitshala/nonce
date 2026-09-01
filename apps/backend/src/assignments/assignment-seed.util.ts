import {
    Assignment,
    DEFAULT_PROTECTED_PATHS,
} from '@/entities/assignment.entity';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { AssignmentConfig } from '@/cohorts/cohorts.config.model';
import { AssignmentStatus } from '@/common/enum';

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
    assignment.deadline = resolveDeadline(
        week.scheduledDate,
        config.deadlineDaysAfterWeek,
    );
    assignment.allowLateSubmission = config.allowLateSubmission ?? true;
    assignment.protectedPaths = config.protectedPaths ?? [
        ...DEFAULT_PROTECTED_PATHS,
    ];
    assignment.maxRunsPerDay = config.maxRunsPerDay ?? 50;
    assignment.runTimeoutMinutes = config.runTimeoutMinutes ?? 10;
    return assignment;
}

/**
 * Deadlines are relative in config and absolute in the database, because the
 * same config seeds every season. Lands on end-of-day IST, matching how
 * `registrationDeadline` is normalised at cohort creation.
 */
function resolveDeadline(
    scheduledDate: Date,
    daysAfterWeek: number | undefined,
): Date | null {
    if (daysAfterWeek === undefined) return null;

    const deadline = new Date(scheduledDate);
    deadline.setUTCDate(deadline.getUTCDate() + daysAfterWeek);
    // 23:59:59.999 IST = 18:29:59.999 UTC
    deadline.setUTCHours(18, 29, 59, 999);
    return deadline;
}
