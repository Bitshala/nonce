import { Module } from '@nestjs/common';
import { ExerciseScoreWritebackService } from '@/assignments/exercise-score-writeback.service';

/**
 * A module of its own so cohorts can re-sync a returning student's scores on
 * enrolment. CohortsModule cannot import AssignmentsModule, which already
 * imports it; both import this instead.
 */
@Module({
    providers: [ExerciseScoreWritebackService],
    exports: [ExerciseScoreWritebackService],
})
export class ExerciseScoreWritebackModule {}
