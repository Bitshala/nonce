import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    Query,
    Res,
    StreamableFile,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { GetUser } from '@/decorators/user.decorator';
import { User } from '@/entities/user.entity';
import { SubmissionsService } from '@/assignments/submissions.service';
import { RunsService } from '@/assignments/runs.service';
import {
    CreateCommitRequestDto,
    CreateRunRequestDto,
    GetFileQueryDto,
    GetTreeQueryDto,
    SaveDraftRequestDto,
} from '@/assignments/assignments.request.dto';
import {
    CIRunDetailResponseDto,
    CIRunSummaryResponseDto,
    CreateCommitResponseDto,
    DraftResponseDto,
    RepoFileResponseDto,
    RepoTreeResponseDto,
} from '@/assignments/assignments.response.dto';

/**
 * Editor endpoints for one submission.
 *
 * The global throttler allows 5 requests per second per IP, which an editor
 * opening a tree and several files blows through immediately — hence the
 * per-route overrides. Reads are generous; writes and dispatches are not.
 */
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@ApiTags('Submissions')
@ApiBearerAuth()
@Controller('submissions')
export class SubmissionsController {
    constructor(
        private readonly submissionsService: SubmissionsService,
        private readonly runsService: RunsService,
    ) {}

    @Get(':id/tree')
    @Throttle({ default: { limit: 60, ttl: 60_000 } })
    @ApiQuery({ name: 'ref', type: 'string', required: false })
    @ApiOperation({ summary: 'File tree for a submission at a ref' })
    async getTree(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: GetTreeQueryDto,
        @GetUser() user: User,
    ): Promise<RepoTreeResponseDto> {
        return this.submissionsService.getTree(id, query.ref, user);
    }

    @Get(':id/file')
    @Throttle({ default: { limit: 120, ttl: 60_000 } })
    @ApiQuery({ name: 'path', type: 'string', required: true })
    @ApiQuery({ name: 'ref', type: 'string', required: false })
    @ApiOperation({
        summary: 'File contents',
        description:
            'Binary files and files over 1 MB come back as metadata with editable=false.',
    })
    async getFile(
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: GetFileQueryDto,
        @GetUser() user: User,
    ): Promise<RepoFileResponseDto> {
        return this.submissionsService.getFile(id, query.path, query.ref, user);
    }

    @Post(':id/commit')
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    @ApiOperation({
        summary: 'Save: writes the changed files as a single commit',
        description:
            'Returns 409 when the branch has moved past baseCommitSha, and 422 listing offending paths when validation fails.',
    })
    async commit(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: CreateCommitRequestDto,
        @GetUser() user: User,
    ): Promise<CreateCommitResponseDto> {
        return this.submissionsService.commit(id, body, user);
    }

    @Put(':id/draft')
    // Autosave is debounced client-side but still the chattiest write here.
    @Throttle({ default: { limit: 120, ttl: 60_000 } })
    @ApiOperation({
        summary: 'Autosave a draft of one file',
        description:
            'Stored in Redis with a 24h TTL. A crash-safety net, not a durable artifact — the commit is the artifact.',
    })
    async saveDraft(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: SaveDraftRequestDto,
        @GetUser() user: User,
    ): Promise<DraftResponseDto> {
        return this.submissionsService.saveDraft(
            id,
            body.path,
            body.content,
            user,
        );
    }

    @Get(':id/draft')
    @Throttle({ default: { limit: 120, ttl: 60_000 } })
    @ApiQuery({ name: 'path', type: 'string', required: true })
    @ApiOperation({ summary: 'Read back an autosaved draft, if any' })
    async getDraft(
        @Param('id', ParseUUIDPipe) id: string,
        @Query('path') path: string,
        @GetUser() user: User,
    ): Promise<DraftResponseDto | null> {
        return this.submissionsService.getDraft(id, path, user);
    }

    @Post(':id/runs')
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    @ApiOperation({
        summary: 'Run: dispatch the grading workflow against a commit',
        description:
            'Idempotent per commit while a run is in flight. Subject to the assignment maxRunsPerDay quota.',
    })
    async createRun(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: CreateRunRequestDto,
        @GetUser() user: User,
    ): Promise<CIRunDetailResponseDto> {
        return this.runsService.createRun(id, body.commitSha, user);
    }

    @Get(':id/runs')
    @Throttle({ default: { limit: 60, ttl: 60_000 } })
    @ApiOperation({ summary: 'Run history for a submission, newest first' })
    async listRuns(
        @Param('id', ParseUUIDPipe) id: string,
        @GetUser() user: User,
    ): Promise<CIRunSummaryResponseDto[]> {
        return this.runsService.listRuns(id, user);
    }

    @Get(':id/archive')
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @ApiOperation({
        summary: 'Download the repository as a zip',
        description:
            'How students keep their work: they have no GitHub access, so this is the export path.',
    })
    async downloadArchive(
        @Param('id', ParseUUIDPipe) id: string,
        @GetUser() user: User,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        const { buffer, filename } =
            await this.submissionsService.downloadArchive(id, user);

        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'X-Content-Type-Options': 'nosniff',
        });
        return new StreamableFile(buffer);
    }
}
