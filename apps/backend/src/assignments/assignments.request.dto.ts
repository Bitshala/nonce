import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsIn,
    IsOptional,
    IsString,
    MaxLength,
    Matches,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
    CommitFileRequest,
    CreateCommitRequest,
    CreateRunRequest,
    SaveDraftRequest,
    UpdateSubmissionScoreRequest,
} from '@nonce/shared';

/** Hard ceiling on files per save. Enforced again in the service with sizes. */
export const MAX_FILES_PER_COMMIT = 200;

const SHA_PATTERN = /^[0-9a-f]{40}$/;

export class CommitFileRequestDto implements CommitFileRequest {
    @IsString()
    @MaxLength(500)
    path!: string;

    @IsString()
    content!: string;

    @IsIn(['utf-8', 'base64'])
    encoding!: 'utf-8' | 'base64';
}

export class CreateCommitRequestDto implements CreateCommitRequest {
    /**
     * The commit the editor loaded from. If the branch has moved past it the
     * save is rejected with a 409 rather than silently overwriting.
     */
    @IsString()
    @Matches(SHA_PATTERN, {
        message: 'baseCommitSha must be a 40-character commit SHA',
    })
    baseCommitSha!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    message?: string;

    @IsArray()
    @ArrayMaxSize(MAX_FILES_PER_COMMIT)
    @ValidateNested({ each: true })
    @Type(() => CommitFileRequestDto)
    files!: CommitFileRequestDto[];

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_FILES_PER_COMMIT)
    @IsString({ each: true })
    deletedPaths?: string[];
}

export class SaveDraftRequestDto implements SaveDraftRequest {
    @IsString()
    @MaxLength(500)
    path!: string;

    @IsString()
    content!: string;
}

export class CreateRunRequestDto implements CreateRunRequest {
    /** Run always grades an explicit commit; there is no "latest" mode. */
    @IsString()
    @Matches(SHA_PATTERN, {
        message: 'commitSha must be a 40-character commit SHA',
    })
    commitSha!: string;
}

export class UpdateSubmissionScoreRequestDto implements UpdateSubmissionScoreRequest {
    @IsOptional()
    @IsBoolean()
    isSubmitted?: boolean;

    @IsOptional()
    @IsBoolean()
    isPassing?: boolean;
}

export class GetTreeQueryDto {
    /** Commit SHA or branch name. Defaults to the submission's default branch. */
    @IsOptional()
    @IsString()
    @MaxLength(100)
    ref?: string;
}

export class GetFileQueryDto extends GetTreeQueryDto {
    @IsString()
    @MaxLength(500)
    path!: string;
}
