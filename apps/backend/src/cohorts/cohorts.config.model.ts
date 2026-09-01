import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsDefined,
    IsEnum,
    IsInt,
    IsNumberString,
    IsOptional,
    IsString,
    Matches,
    Max,
    Min,
    ValidateIf,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssignmentBackend, UserRole } from '@/common/enum';

export class QuestionConfig {
    @IsString()
    text!: string;

    // Optional file names, relative to the cohort's attachments directory
    // (assets/cohort-configs/attachments/<cohort>/). Each must exist on disk.
    // Omit when the question has no attachments.
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    attachments?: string[];
}

export class ReadingMaterialConfig {
    @IsString()
    label!: string;

    @IsString()
    url!: string;
}

export class ExerciseConfig {
    @IsString()
    title!: string;

    @IsString()
    concepts!: string;

    @IsString()
    problem!: string;

    @IsArray()
    @IsString({ each: true })
    expectedOutput!: string[];
}

export class AssignmentConfig {
    // Becomes part of the repo name (`<slug>-s<season>-<userId>`), so keep it
    // short, lowercase, and hyphenated.
    @IsString()
    @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
        message:
            'slug must be lowercase alphanumeric segments separated by "-"',
    })
    slug!: string;

    @IsString()
    templateOwner!: string;

    @IsString()
    templateRepo!: string;

    // Branch or tag of the template to instantiate; omit for its default branch.
    @IsOptional()
    @IsString()
    templateRef?: string;

    // Path to the test suite inside the grader repo, e.g. `tests/pb-week-3`.
    @IsString()
    graderTestPath!: string;

    // Workflow file within the grader repo. Defaults to the shared grade.yml.
    @IsOptional()
    @IsString()
    graderWorkflowPath?: string;

    // Editor writes to these are refused. Defaults to `.github/**`.
    // Supports exact paths and `prefix/**` patterns only.
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    protectedPaths?: string[];

    // Days after the week's scheduled date that the deadline falls on. Omit for
    // no deadline at all, in which case every run counts for score.
    @IsOptional()
    @IsInt()
    @Min(0)
    deadlineDaysAfterWeek?: number;

    // Whether saving and running stay permitted after the deadline. They never
    // affect the score once the deadline passes; this only gates access.
    @IsOptional()
    @IsBoolean()
    allowLateSubmission?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    maxRunsPerDay?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(60)
    runTimeoutMinutes?: number;
}

export class CohortWeekConfig {
    @IsBoolean()
    hasExercise!: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuestionConfig)
    questions!: QuestionConfig[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuestionConfig)
    bonusQuestions!: QuestionConfig[];

    @IsString()
    title!: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReadingMaterialConfig)
    readingMaterial!: ReadingMaterialConfig[];

    // Optional free-text activity for the week. Omit when there is none.
    @IsOptional()
    @IsString()
    activity?: string;

    // Exercise content. Required when `hasExercise` is true; omit otherwise.
    // (When `hasExercise` is false but an exercise is present, it is still
    // validated.)
    @ValidateIf((o: CohortWeekConfig) => o.hasExercise || o.exercise != null)
    @IsDefined()
    @ValidateNested()
    @Type(() => ExerciseConfig)
    exercise?: ExerciseConfig;

    // Grading mechanics. Required on an exercise week of an INHOUSE cohort;
    // ignored on a CLASSROOM one. Validated conditionally on CohortConfig,
    // which is where the backend is declared.
    @IsOptional()
    @ValidateNested()
    @Type(() => AssignmentConfig)
    assignment?: AssignmentConfig;
}

export class LinkConfig {
    @IsString()
    label!: string;

    @IsString()
    url!: string;

    // Minimum role required to see this link. Absent => visible to everyone.
    @IsOptional()
    @IsEnum(UserRole)
    minRole?: UserRole;
}

export class CohortConfig {
    @IsInt()
    @Min(1)
    @Max(8)
    gdSessions!: number;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(8)
    @ValidateNested({ each: true })
    @Type(() => CohortWeekConfig)
    weeks!: CohortWeekConfig[];

    // Which exercise system this cohort's weeks are graded by. Defaults to
    // CLASSROOM so every existing config keeps its current meaning.
    @IsOptional()
    @IsEnum(AssignmentBackend)
    assignmentBackend?: AssignmentBackend;

    // Only meaningful on a CLASSROOM cohort with at least one exercise week.
    @IsNumberString({
        no_symbols: true,
        locale: 'en-US',
    })
    @ValidateIf(
        (o: CohortConfig) =>
            (o.assignmentBackend ?? AssignmentBackend.CLASSROOM) ===
                AssignmentBackend.CLASSROOM &&
            o.weeks.some((week: CohortWeekConfig) => week.hasExercise),
    )
    classroomId!: string;

    // Course-specific links for this cohort. Use [] if there are none.
    // Global links shared by every cohort (e.g. Wheel of Names, MultiBuzz) are
    // defined once in CohortsConfigService and merged in at load time.
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LinkConfig)
    links!: LinkConfig[];
}
