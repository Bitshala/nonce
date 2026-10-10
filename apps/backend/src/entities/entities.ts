import { Assignment } from '@/entities/assignment.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { Attendance } from '@/entities/attendance.entity';
import { CIRun } from '@/entities/ci-run.entity';
import { CIRunLog } from '@/entities/ci-run-log.entity';
import { Cohort } from '@/entities/cohort.entity';
import { CohortMembership } from '@/entities/cohort-membership.entity';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { GroupDiscussionScore } from '@/entities/group-discussion-score.entity';
import { User } from '@/entities/user.entity';
import { APITask } from '@/entities/api-task.entity';
import { Feedback } from '@/entities/feedback.entity';
import { FellowshipApplication } from '@/entities/fellowship-application.entity';
import { FellowshipApplicationNote } from '@/entities/fellowship-application-note.entity';
import { Fellowship } from '@/entities/fellowship.entity';
import { FellowshipDocument } from '@/entities/fellowship-document.entity';
import { FellowshipReport } from '@/entities/fellowship-report.entity';
import { FellowshipReportNote } from '@/entities/fellowship-report-note.entity';

export const entities = [
    APITask,
    Assignment,
    AssignmentSubmission,
    Attendance,
    CIRun,
    CIRunLog,
    Cohort,
    CohortMembership,
    CohortWeek,
    ExerciseScore,
    Feedback,
    Fellowship,
    FellowshipApplication,
    FellowshipApplicationNote,
    FellowshipDocument,
    FellowshipReport,
    FellowshipReportNote,
    GroupDiscussionScore,
    User,
];
