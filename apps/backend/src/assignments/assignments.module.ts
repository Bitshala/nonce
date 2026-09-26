import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '@/entities/assignment.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { CIRun } from '@/entities/ci-run.entity';
import { CIRunLog } from '@/entities/ci-run-log.entity';
import { Cohort } from '@/entities/cohort.entity';
import { CohortMembership } from '@/entities/cohort-membership.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { APITask } from '@/entities/api-task.entity';
import { GitHubAppClientModule } from '@/github-app/client/github-app-client.module';
import { DbTransactionModule } from '@/db-transaction/db-transaction.module';
import { CohortsModule } from '@/cohorts/cohorts.module';
import { AssignmentsController } from '@/assignments/assignments.controller';
import { AssignmentsService } from '@/assignments/assignments.service';
import { AssignmentProvisioningService } from '@/assignments/assignment-provisioning.service';
import { SubmissionsController } from '@/assignments/submissions.controller';
import { SubmissionsService } from '@/assignments/submissions.service';
import { RunsController } from '@/assignments/runs.controller';
import { RunsService } from '@/assignments/runs.service';
import { GitHubWebhookController } from '@/assignments/github-webhook.controller';
import { GitHubWebhookGuard } from '@/assignments/github-webhook.guard';
import { AdminAssignmentsController } from '@/assignments/admin-assignments.controller';
import { AdminAssignmentsService } from '@/assignments/admin-assignments.service';
import { ExerciseScoreWritebackService } from '@/assignments/exercise-score-writeback.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            APITask,
            Assignment,
            AssignmentSubmission,
            CIRun,
            CIRunLog,
            Cohort,
            CohortMembership,
            ExerciseScore,
        ]),
        GitHubAppClientModule,
        DbTransactionModule,
        // For CohortsConfigService, which owns the config assignments are
        // authored in.
        CohortsModule,
    ],
    controllers: [
        AssignmentsController,
        SubmissionsController,
        RunsController,
        GitHubWebhookController,
        AdminAssignmentsController,
    ],
    providers: [
        AssignmentsService,
        AssignmentProvisioningService,
        SubmissionsService,
        RunsService,
        AdminAssignmentsService,
        ExerciseScoreWritebackService,
        GitHubWebhookGuard,
    ],
    // Exported for TaskProcessorModule, which dispatches the three task types
    // this module owns.
    exports: [
        AssignmentProvisioningService,
        RunsService,
        AdminAssignmentsService,
    ],
})
export class AssignmentsModule {}
