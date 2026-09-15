import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GetUser } from '@/decorators/user.decorator';
import { User } from '@/entities/user.entity';
import { AssignmentsService } from '@/assignments/assignments.service';
import {
    AssignmentDetailResponseDto,
    AssignmentSummaryResponseDto,
    SubmissionResponseDto,
} from '@/assignments/assignments.response.dto';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@ApiTags('Assignments')
@ApiBearerAuth()
@Controller('assignments')
export class AssignmentsController {
    constructor(private readonly assignmentsService: AssignmentsService) {}

    @Get('me')
    @ApiOperation({
        summary: 'List my assignments across every cohort I belong to',
        description:
            'Includes my submission and its latest/best run when I have accepted.',
    })
    async listMine(
        @GetUser() user: User,
    ): Promise<AssignmentSummaryResponseDto[]> {
        return this.assignmentsService.listMyAssignments(user);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Assignment detail, including the problem statement',
    })
    async getOne(
        @Param('id', ParseUUIDPipe) id: string,
        @GetUser() user: User,
    ): Promise<AssignmentDetailResponseDto> {
        return this.assignmentsService.getAssignment(id, user);
    }

    @Post(':id/accept')
    // Provisioning is expensive and the endpoint is idempotent, so a tight
    // limit costs a double-clicking student nothing.
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({
        summary: 'Accept an assignment and queue repository provisioning',
        description:
            'Returns 202 with the submission. Repeat calls return the existing submission rather than creating a second repository.',
    })
    async accept(
        @Param('id', ParseUUIDPipe) id: string,
        @GetUser() user: User,
    ): Promise<SubmissionResponseDto> {
        return this.assignmentsService.accept(id, user);
    }
}
