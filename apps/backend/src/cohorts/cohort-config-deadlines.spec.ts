import { readFileSync } from 'fs';
import { join } from 'path';
import { applyAssignmentConfig } from '@/assignments/assignment-seed.util';
import { Assignment } from '@/entities/assignment.entity';
import { CohortWeek } from '@/entities/cohort-week.entity';

/**
 * Every exercise has to be submitted before graduation, so each assignment's
 * `deadlineDaysAfterWeek` is the distance from its own week to the graduation
 * week — a different number for every week, and one nothing else would catch
 * if it were wrong. A week added to a config, or a changed `gdSessions`, moves
 * graduation and silently leaves all of that cohort's deadlines short.
 *
 * So: rebuild the schedule the way `createCohort` does and check each deadline
 * lands on graduation day.
 */
describe('cohort configs — assignment deadlines land on graduation day', () => {
    const dir = join(__dirname, '..', '..', 'assets', 'cohort-configs');
    // Arbitrary; the assertion is relative, so any start date will do.
    const start = new Date('2026-03-02T00:00:00.000Z');

    const weekDate = (week: number): Date => {
        const date = new Date(start);
        date.setUTCDate(date.getUTCDate() + week * 7);
        return date;
    };

    const inhouseConfigs = [
        'learning-bitcoin-from-command-line.json',
        'bitcoin-protocol-development.json',
        'mastering-lightning-network.json',
        'programming-bitcoin.json',
    ];

    for (const file of inhouseConfigs) {
        it(file, () => {
            const config = JSON.parse(
                readFileSync(join(dir, file), 'utf-8'),
            ) as {
                gdSessions: number;
                weeks: {
                    hasExercise: boolean;
                    assignment?: { slug: string };
                }[];
            };

            // createCohort lays out weeks 0..gdSessions+1: orientation, the GD
            // weeks, then graduation.
            const graduation = weekDate(config.gdSessions + 1);
            // resolveDeadline lands on 23:59:59.999 IST.
            graduation.setUTCHours(18, 29, 59, 999);

            let checked = 0;
            config.weeks.forEach((weekConfig, index) => {
                if (!weekConfig.assignment) return;

                const week = {
                    week: index + 1,
                    scheduledDate: weekDate(index + 1),
                } as CohortWeek;
                const assignment = applyAssignmentConfig(
                    new Assignment(),
                    weekConfig.assignment as never,
                    week,
                    1,
                );

                // Compared as an object so a failure names the week at fault.
                expect({
                    slug: weekConfig.assignment.slug,
                    deadline: assignment.deadline?.toISOString(),
                }).toEqual({
                    slug: weekConfig.assignment.slug,
                    deadline: graduation.toISOString(),
                });
                checked++;
            });

            // An exercise week with no assignment block would otherwise pass
            // here by being skipped; boot-time validation rejects it, and this
            // keeps the two in agreement.
            expect(checked).toBe(
                config.weeks.filter((w) => w.hasExercise).length,
            );
        });
    }
});
