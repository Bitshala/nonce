import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsNumberString,
    IsOptional,
} from 'class-validator';
import { CohortType } from '@/common/enum';
import type {
    CreateCohortRequest,
    JoinWaitlistRequest,
    UpdateCohortRequest,
    UpdateCohortWeekRequest,
} from '@nonce/shared';

export class UpdateCohortRequestDto implements UpdateCohortRequest {
    @IsOptional()
    @IsDateString({ strict: true })
    startDate?: string;

    @IsOptional()
    @IsDateString({ strict: true })
    registrationDeadline?: string;
}

export class CreateCohortRequestDto implements CreateCohortRequest {
    @IsEnum(CohortType)
    type!: CohortType;

    @IsDateString({ strict: true })
    startDate!: string;

    @IsDateString({ strict: true })
    registrationDeadline!: string;
}

export class UpdateCohortWeekRequestDto implements UpdateCohortWeekRequest {
    @IsOptional()
    @IsNumberString({
        no_symbols: true,
        locale: 'en-US',
    })
    @IsNotEmpty()
    classroomAssignmentId!: string | undefined;

    @IsOptional()
    @IsDateString({ strict: true })
    scheduledDate!: string | undefined;
}

export class JoinWaitlistRequestDto implements JoinWaitlistRequest {
    @IsEnum(CohortType)
    type!: CohortType;
}
