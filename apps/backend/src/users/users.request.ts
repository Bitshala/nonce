import {
    IsArray,
    IsDateString,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    Min,
    Max,
    IsUUID,
    IsEnum,
    IsEmail,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginatedQueryDto } from '@/common/dto';
import {
    CohortMatchMode,
    CohortType,
    SortOrder,
    UserRole,
} from '@/common/enum';

export class UpdateUserRequest {
    @IsOptional()
    @IsEmail()
    email?: string;

    /** Full name or pseudonym */
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name?: string;

    /** Describe yourself */
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(10000)
    description?: string;

    /** High-level background (career, education, etc.) */
    @IsOptional()
    @IsString()
    @MaxLength(10000)
    background?: string;

    /** GitHub profile URL */
    @IsOptional()
    @IsUrl({ require_protocol: true })
    @MaxLength(2048)
    githubProfileUrl?: string;

    /** Portfolio or side-project URL */
    @IsOptional()
    @IsUrl({ require_protocol: true })
    @MaxLength(2048)
    portfolioUrl?: string;

    /** LinkedIn profile URL */
    @IsOptional()
    @IsUrl({ require_protocol: true })
    @MaxLength(2048)
    linkedinProfileUrl?: string;

    /** Skills */
    @IsOptional()
    @IsArray()
    @IsNotEmpty({ each: true })
    @IsString({ each: true })
    skills?: string[];

    /** When first heard about Bitcoin (ISO date, e.g., 2015-06-01) */
    @IsOptional()
    @IsDateString()
    firstHeardAboutBitcoinOn?: string;

    /** Bitcoin books read */
    @IsOptional()
    @IsArray()
    @IsNotEmpty({ each: true })
    @IsString({ each: true })
    bitcoinBooksRead?: string[];

    /** Motivation */
    @IsOptional()
    @IsString()
    @MaxLength(10000)
    whyBitcoin?: string;

    /** Hours per week (0–168) */
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(168)
    weeklyCohortCommitmentHours?: number;

    /** Free-form location (e.g., "Bengaluru, IN") */
    @IsOptional()
    @IsString()
    @MaxLength(255)
    location?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    referral?: string;
}

export class UpdateUserRoleRequest {
    @IsUUID()
    userId: string;

    @IsEnum(UserRole)
    role: UserRole;
}

export enum UserSortBy {
    CREATED_AT = 'createdAt',
    NAME = 'name',
    EMAIL = 'email',
}

export class ListUsersQueryDto extends PaginatedQueryDto {
    /**
     * Case-insensitive substring match on the user's name, email and Discord
     * usernames.
     */
    @IsOptional()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @MaxLength(100)
    search?: string;

    /**
     * Case-insensitive substring match on the user's free-form location
     * (e.g. "Bengaluru, IN"). AND-ed with `search`.
     */
    @IsOptional()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim() : value,
    )
    @IsString()
    @MaxLength(100)
    location?: string;

    /**
     * Keeps only users who have completed at least this many distinct courses.
     * A course counts once however many seasons of it the user finished, so this
     * is not the same number as the overview page's `cohortSummary.completedCount`
     * (which counts one per season). 0 is a no-op.
     */
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    minCompletedCohorts?: number;

    /**
     * Keeps only users who have completed these courses, in any season. How the
     * list combines is governed by `completedCohortMatch`.
     *
     * The Transform is what lets a single value through: a one-element array in
     * the query string arrives as a bare string, which @IsArray would reject.
     */
    @IsOptional()
    @Transform(({ value }) =>
        value === undefined || Array.isArray(value) ? value : [value],
    )
    @IsArray()
    @IsEnum(CohortType, { each: true })
    completedCohortTypes?: CohortType[];

    @IsOptional()
    @IsEnum(CohortMatchMode)
    completedCohortMatch: CohortMatchMode = CohortMatchMode.ANY;

    @IsOptional()
    @IsEnum(UserSortBy)
    sortBy: UserSortBy = UserSortBy.CREATED_AT;

    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder: SortOrder = SortOrder.DESC;
}
