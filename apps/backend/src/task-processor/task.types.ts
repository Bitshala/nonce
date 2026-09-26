import { TaskType } from '@/task-processor/task.enums';

export type AssignCohortRoleTaskData = {
    userId: string;
    cohortId: string;
};

export type AssignCohortAlumniRoleTaskData = {
    cohortId: string;
};

export type ReconcileCohortDiscordRolesTaskData = {
    cohortId: string;
};

export type SyncClassroomScoresTaskData = {
    cohortId: string;
};

export type SendCohortReminderEmailsTaskData = {
    cohortId: string;
    cohortWeekId: string;
};

export type SendCertificateEmailsTaskData = {
    cohortId: string;
};

export type SendFeedbackReminderEmailsTaskData = {
    cohortId: string;
};

export type SendCalendarUpdateEmailsTaskData = {
    cohortId: string;
};

export type SendFellowshipReportReminderEmailsTaskData = {
    month: number;
    year: number;
};

export type ProvisionAssignmentRepoTaskData = {
    submissionId: string;
};

export type ReconcileCIRunTaskData = {
    ciRunId: string;
    // Bumped on each self-reschedule so the handler can give up on correlating
    // a dispatch that GitHub never turned into a run.
    attempt: number;
};

export type ArchiveAssignmentReposTaskData = {
    cohortId: string;
};

export type TaskDataMap = {
    [TaskType.ASSIGN_COHORT_ROLE]: AssignCohortRoleTaskData;
    [TaskType.ASSIGN_COHORT_ALUMNI_ROLE]: AssignCohortAlumniRoleTaskData;
    [TaskType.RECONCILE_COHORT_DISCORD_ROLES]: ReconcileCohortDiscordRolesTaskData;
    [TaskType.SYNC_CLASSROOM_SCORES]: SyncClassroomScoresTaskData;
    [TaskType.SEND_COHORT_REMINDER_EMAILS]: SendCohortReminderEmailsTaskData;
    [TaskType.SEND_CERTIFICATE_EMAILS]: SendCertificateEmailsTaskData;
    [TaskType.SEND_FEEDBACK_REMINDER_EMAILS]: SendFeedbackReminderEmailsTaskData;
    [TaskType.SEND_CALENDAR_UPDATE_EMAILS]: SendCalendarUpdateEmailsTaskData;
    [TaskType.SEND_FELLOWSHIP_REPORT_REMINDER_EMAILS]: SendFellowshipReportReminderEmailsTaskData;
    [TaskType.PROVISION_ASSIGNMENT_REPO]: ProvisionAssignmentRepoTaskData;
    [TaskType.RECONCILE_CI_RUN]: ReconcileCIRunTaskData;
    [TaskType.ARCHIVE_ASSIGNMENT_REPOS]: ArchiveAssignmentReposTaskData;
};

export type TaskData<T extends TaskType> = TaskDataMap[T];
