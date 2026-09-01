import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager } from 'typeorm';
import { DbTransactionService } from '@/db-transaction/db-transaction.service';
import { APITask } from '@/entities/api-task.entity';
import { APITaskStatus, TaskType } from '@/task-processor/task.enums';
import { ApiError, ServiceError } from '@/common/errors';
import { DiscordAlertService } from '@/common/discord-alert.service';
import { CohortsService } from '@/cohorts/cohorts.service';
import { GitHubClassroomService } from '@/github-classroom/github-classroom.service';
import { CohortReminderService } from '@/cohorts/cohort-reminder.service';
import { CertificatesService } from '@/certificates/certificates.service';
import { CohortCalendarService } from '@/cohort-calendar/cohort-calendar.service';
import { FellowshipReportsService } from '@/fellowship-reports/fellowship-reports.service';
import { AssignmentProvisioningService } from '@/assignments/assignment-provisioning.service';
import { RunsService } from '@/assignments/runs.service';
import { AdminAssignmentsService } from '@/assignments/admin-assignments.service';

@Injectable()
export class APITaskProcessorService {
    private readonly logger = new Logger(APITaskProcessorService.name);
    private readonly MESSAGE_BATCH_SIZE = 10;
    // How long a finished task is kept before pruning. Terminal rows were previously
    // never deleted, so ~93% of api_task was PROCESSED history that the poller had to
    // scan past on every run.
    private readonly TASK_RETENTION_DAYS = 30;

    constructor(
        private readonly dbTransactionService: DbTransactionService,
        private readonly cohortsService: CohortsService,
        private readonly gitHubClassroomService: GitHubClassroomService,
        private readonly cohortReminderService: CohortReminderService,
        private readonly certificatesService: CertificatesService,
        private readonly cohortCalendarService: CohortCalendarService,
        private readonly fellowshipReportsService: FellowshipReportsService,
        private readonly assignmentProvisioningService: AssignmentProvisioningService,
        private readonly runsService: RunsService,
        private readonly adminAssignmentsService: AdminAssignmentsService,
        private readonly discordAlert: DiscordAlertService,
    ) {}

    private async fetchUnprocessedTasks(): Promise<APITask<any>[]> {
        // One timestamp for the whole statement rather than three separate new Date()
        // calls interpolated at different points.
        const now = new Date();

        const queryResult = await this.dbTransactionService.execute(
            async (manager: EntityManager) => {
                // The status values stay inlined. They are compile-time enum constants,
                // never user input, and they MUST remain literals: the api_task partial
                // indexes are defined `WHERE "status" = '...'`, and the planner can only
                // prove a query matches that predicate when the value is known at plan
                // time. Passing them as bind parameters would let a generic plan fall
                // back to a sequential scan. The timestamp and limit are parameterised,
                // which is what actually varies between executions.
                return manager.query(
                    `
                    UPDATE
                        api_task ca
                    SET
                        "status" = '${APITaskStatus.PROCESSING}',
                        "processStartTime" = $1::timestamptz
                    FROM (
                        SELECT
                            "id",
                            "type",
                            "data",
                            "status",
                            "processStartTime",
                            "retryCount",
                            "retryLimit"
                        FROM
                            api_task
                        WHERE
                            ("status" = '${APITaskStatus.UNPROCESSED}' AND "executeOnTime" <= $1::timestamptz)  OR
                            ("status" = '${APITaskStatus.FAILED}' AND "retryCount" < "retryLimit" AND "lastRetryTime" < $1::timestamptz - (2 ^ ("retryCount" - 1)) * INTERVAL '8 seconds')
                        ORDER BY
                            "updatedAt"
                        LIMIT $2
                        FOR UPDATE SKIP LOCKED) sub
                    WHERE
                        ca. "id" = sub. "id"
                    RETURNING *;
                    `,
                    [now, this.MESSAGE_BATCH_SIZE],
                );
            },
        );
        return queryResult[0];
    }

    private async processTask(task: APITask<any>): Promise<void> {
        this.logger.log(`Processing task ${task.id}`);

        task.status = APITaskStatus.PROCESSING;

        try {
            switch (task.type) {
                case TaskType.ASSIGN_COHORT_ROLE:
                    await this.cohortsService.assignDiscordRole(
                        task.data.userId,
                        task.data.cohortId,
                    );
                    break;
                case TaskType.ASSIGN_COHORT_ALUMNI_ROLE:
                    await this.cohortsService.handleAssignAlumniRolesTask(task);
                    break;
                case TaskType.RECONCILE_COHORT_DISCORD_ROLES:
                    await this.cohortsService.handleReconcileDiscordRolesTask(
                        task,
                    );
                    break;
                case TaskType.SYNC_CLASSROOM_SCORES:
                    await this.gitHubClassroomService.handleSyncClassroomTask(
                        task,
                    );
                    break;
                case TaskType.SEND_COHORT_REMINDER_EMAILS:
                    await this.cohortReminderService.handleSendCohortReminderEmails(
                        task,
                    );
                    break;
                case TaskType.SEND_CERTIFICATE_EMAILS:
                    await this.certificatesService.handleSendCertificateEmails(
                        task,
                    );
                    break;
                case TaskType.SEND_FEEDBACK_REMINDER_EMAILS:
                    await this.cohortReminderService.handleSendFeedbackReminderEmails(
                        task,
                    );
                    break;
                case TaskType.SEND_CALENDAR_UPDATE_EMAILS:
                    await this.cohortCalendarService.handleSendCalendarUpdateEmails(
                        task,
                    );
                    break;
                case TaskType.SEND_FELLOWSHIP_REPORT_REMINDER_EMAILS:
                    await this.fellowshipReportsService.handleSendReportReminderEmails(
                        task,
                    );
                    break;
                case TaskType.PROVISION_ASSIGNMENT_REPO:
                    await this.assignmentProvisioningService.handleProvisionAssignmentRepo(
                        task,
                    );
                    break;
                case TaskType.RECONCILE_CI_RUN:
                    await this.runsService.handleReconcileCIRun(task);
                    break;
                case TaskType.ARCHIVE_ASSIGNMENT_REPOS:
                    await this.adminAssignmentsService.handleArchiveAssignmentRepos(
                        task,
                    );
                    break;
                default:
                    throw new ApiError(
                        `Unknown task type ${task.type} for task ${task.id}`,
                    );
            }
        } catch (error) {
            this.logger.error(`Failed Task: ${error.message}`, error.stack);

            let wrappedError: ServiceError = error;
            if (!(error instanceof ServiceError)) {
                wrappedError = new ServiceError(error.message, error.stack);
            }

            await this.dbTransactionService.execute(async (manager) => {
                await manager.update(
                    APITask,
                    { id: task.id },
                    {
                        status: APITaskStatus.FAILED,
                        retryCount: task.retryCount + 1,
                        lastRetryTime: new Date(),
                        lastExecutionFailureDetails: error.message,
                    },
                );
            });

            wrappedError.logError(this.logger);
            void this.discordAlert.sendErrorAlert(wrappedError, {
                type: 'task',
                taskId: task.id,
                taskType: task.type,
            });
            return;
        }

        this.logger.log(`Task ${task.id} processed successfully`);

        await this.dbTransactionService.execute(async (manager) => {
            await manager.update(
                APITask,
                { id: task.id },
                {
                    status: APITaskStatus.PROCESSED,
                },
            );
        });
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    processTasks(): void {
        this.fetchUnprocessedTasks()
            .then(async (tasks) => {
                await Promise.all(
                    tasks.map((task) => this.processTask(task), this),
                );
            })
            .catch((error) => {
                this.logger.error(error, error.stack);
                const wrappedError =
                    error instanceof ServiceError
                        ? error
                        : ServiceError.fromError(error);
                void this.discordAlert.sendErrorAlert(wrappedError);
            });
    }

    private async pruneFinishedTasks(): Promise<number> {
        const cutoff = new Date();
        cutoff.setUTCDate(cutoff.getUTCDate() - this.TASK_RETENTION_DAYS);

        return this.dbTransactionService.execute(
            async (manager: EntityManager) => {
                // Only genuinely finished work. FAILED rows are deliberately kept: those
                // under their retry limit are still due to be picked up, and the
                // exhausted ones are the ones worth looking at when something breaks.
                // No index backs this predicate on purpose -- one would have to cover
                // the ~93% of the table we are trying to get rid of, and this runs once
                // a day rather than every ten seconds.
                const result = await manager.query(
                    `
                    DELETE FROM api_task
                    WHERE "status" IN ('${APITaskStatus.PROCESSED}', '${APITaskStatus.CANCELLED}')
                      AND "updatedAt" < $1::timestamptz
                    `,
                    [cutoff],
                );
                return result?.[1] ?? 0;
            },
        );
    }

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    pruneTasks(): void {
        this.pruneFinishedTasks()
            .then((deleted) => {
                if (deleted > 0) {
                    this.logger.log(
                        `Pruned ${deleted} api_task rows finished more than ${this.TASK_RETENTION_DAYS} days ago`,
                    );
                }
            })
            .catch((error) => {
                this.logger.error(error, error.stack);
                const wrappedError =
                    error instanceof ServiceError
                        ? error
                        : ServiceError.fromError(error);
                void this.discordAlert.sendErrorAlert(wrappedError);
            });
    }
}
