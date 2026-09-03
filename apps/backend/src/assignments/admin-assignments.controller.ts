import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/auth/roles.decorator';
import { GetUser } from '@/decorators/user.decorator';
import { User } from '@/entities/user.entity';
import { UserRole } from '@/common/enum';
import { AdminAssignmentsService } from '@/assignments/admin-assignments.service';
import {
    AdminSubmissionResponseDto,
    RegradeResponseDto,
    SyncAssignmentsResponseDto,
} from '@/assignments/assignments.response.dto';
import { UpdateSubmissionScoreRequestDto } from '@/assignments/assignments.request.dto';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@ApiTags('Admin — Assignments')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.TEACHING_ASSISTANT)
@Controller('admin')
export class AdminAssignmentsController {
    constructor(
        private readonly adminAssignmentsService: AdminAssignmentsService,
    ) {}

    @Post('cohorts/:cohortId/sync-assignments')
    // Rewriting assignment mechanics is an admin-only action; a TA re-running
    // a grader is not the same thing as changing what the grader is.
    @Roles(UserRole.ADMIN)
    @ApiOperation({
        summary: 'Re-seed a cohort’s assignments from its config file',
        description:
            'Assignments are authored in assets/cohort-configs. This applies config edits to a cohort that already exists.',
    })
    async syncAssignments(
        @Param('cohortId', ParseUUIDPipe) cohortId: string,
    ): Promise<SyncAssignmentsResponseDto> {
        return this.adminAssignmentsService.syncAssignments(cohortId);
    }

    @Get('assignments/:id/submissions')
    @ApiOperation({
        summary: 'Every submission for an assignment, with its current score',
    })
    async listSubmissions(
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<AdminSubmissionResponseDto[]> {
        return this.adminAssignmentsService.listSubmissions(id);
    }

    @Post('submissions/:id/reprovision')
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({
        summary: 'Retry repository provisioning for a failed submission',
    })
    async reprovision(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.adminAssignmentsService.reprovision(id);
    }

    @Post('assignments/:id/regrade')
    @ApiOperation({
        summary: 'Re-dispatch grading for every submission with student work',
        description:
            'Use after fixing a grader bug. Submissions with no commits beyond the template are skipped.',
    })
    async regrade(
        @Param('id', ParseUUIDPipe) id: string,
        @GetUser() user: User,
    ): Promise<RegradeResponseDto> {
        return this.adminAssignmentsService.regrade(id, user);
    }

    @Patch('submissions/:id/score')
    @Roles(UserRole.ADMIN)
    @ApiOperation({
        summary: 'Manually override a submission’s exercise score',
        description:
            'Writes ExerciseScore directly for cases grading cannot express. Runs are left untouched.',
    })
    async overrideScore(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: UpdateSubmissionScoreRequestDto,
    ): Promise<void> {
        return this.adminAssignmentsService.overrideScore(id, body);
    }

    @Post('cohorts/:cohortId/archive-assignment-repos')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({
        summary: 'Queue read-only archival of every repo in a cohort',
        description:
            'Repos are archived, never deleted. Students keep their work through the zip export.',
    })
    async archive(
        @Param('cohortId', ParseUUIDPipe) cohortId: string,
    ): Promise<void> {
        return this.adminAssignmentsService.queueArchive(cohortId);
    }
}
