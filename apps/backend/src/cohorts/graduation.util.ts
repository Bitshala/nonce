import { EntityManager } from 'typeorm';
import { endOfDayIst, isGraduationPassed } from '@nonce/shared/deadline';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { CohortWeekType } from '@/common/enum';

/**
 * Graduated cohorts are frozen: their scores feed certificates and the
 * leaderboard, so once graduation day is over (end of its day in IST, the
 * same instant every deadline uses) nothing automatic may write their
 * `ExerciseScore` rows again — not the Classroom sync, not in-house grading,
 * not a re-seed.
 */

/** When the cohort's scores freeze, or null if it has no graduation week. */
export function graduationCutoff(
    weeks: Pick<CohortWeek, 'type' | 'scheduledDate'>[],
): Date | null {
    const graduation = weeks.find((w) => w.type === CohortWeekType.GRADUATION);
    return graduation ? endOfDayIst(graduation.scheduledDate) : null;
}

/** For a cohort whose weeks are already loaded. */
export function hasGraduated(
    weeks: Pick<CohortWeek, 'type' | 'scheduledDate'>[],
    now: Date = new Date(),
): boolean {
    const graduation = weeks.find((w) => w.type === CohortWeekType.GRADUATION);
    return (
        graduation != null && isGraduationPassed(graduation.scheduledDate, now)
    );
}

/** For a cohort known only by id; reads just its graduation week. */
export async function hasCohortGraduated(
    manager: EntityManager,
    cohortId: string,
    now: Date = new Date(),
): Promise<boolean> {
    const graduation = await manager.findOne(CohortWeek, {
        where: { cohort: { id: cohortId }, type: CohortWeekType.GRADUATION },
        select: { id: true, type: true, scheduledDate: true },
    });
    return graduation != null && hasGraduated([graduation], now);
}
