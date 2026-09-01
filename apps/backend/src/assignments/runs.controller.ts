import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GetUser } from '@/decorators/user.decorator';
import { User } from '@/entities/user.entity';
import { RunsService } from '@/assignments/runs.service';
import {
    CIRunDetailResponseDto,
    CIRunLogResponseDto,
} from '@/assignments/assignments.response.dto';

@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@ApiTags('Runs')
@ApiBearerAuth()
@Controller('runs')
export class RunsController {
    constructor(private readonly runsService: RunsService) {}

    @Get(':id')
    // The frontend polls this while a run is live, so the limit has to cover a
    // 2s interval with a little headroom.
    @Throttle({ default: { limit: 60, ttl: 60_000 } })
    @ApiOperation({
        summary: 'Run detail, including the step checklist and test report',
        description:
            'Refreshes from GitHub on the way out while the run is live, rate-limited by a short server-side cooldown.',
    })
    async getRun(
        @Param('id', ParseUUIDPipe) id: string,
        @GetUser() user: User,
    ): Promise<CIRunDetailResponseDto> {
        return this.runsService.getRun(id, user);
    }

    @Get(':id/logs')
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    @ApiOperation({
        summary: 'Full grader log for a completed run',
        description:
            'Captured once when the run completes. Capped at 2 MB with the middle dropped and the tail kept.',
    })
    async getLogs(
        @Param('id', ParseUUIDPipe) id: string,
        @GetUser() user: User,
    ): Promise<CIRunLogResponseDto> {
        return this.runsService.getLogs(id, user);
    }
}
