import { readFileSync } from 'fs';
import { join } from 'path';
import {
    applyAssignmentConfig,
    resolveDeadline,
} from '@/assignments/assignment-seed.util';
import { Assignment } from '@/entities/assignment.entity';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { AssignmentDeadlineSource } from '@/common/enum';

/**
 * Every exercise is due at its cohort's graduation day, and has to stay there
 * when the cohort moves — `Assignment.deadline` is a materialised date, so the
 * rule behind it is what actually has to be right in config.
 *
 * Checks both halves: that each in-house assignment is anchored to GRADUATION,
 * and that resolving that anchor lands on graduation day whatever date
 * graduation happens to be.
 */
describe('cohort configs — exercise deadlines follow graduation', () => {
    const dir = join(__dirname, '..', '..', 'assets', 'cohort-configs');

    const inhouseConfigs = [
        'learning-bitcoin-from-command-line.json',
        'bitcoin-protocol-development.json',
        'mastering-lightning-network.json',
        'programming-bitcoin.json',
    ];

    const load = (file: string) =>
        JSON.parse(readFileSync(join(dir, file), 'utf-8')) as {
            gdSessions: number;
            weeks: {
                hasExercise: boolean;
                assignment?: { slug: string };
            }[];
        };

    const seed = (weekConfig: { slug: string }, weekNumber: number) => {
        const scheduled = new Date('2026-03-02T00:00:00.000Z');
        scheduled.setUTCDate(scheduled.getUTCDate() + weekNumber * 7);
        return applyAssignmentConfig(
            new Assignment(),
            weekConfig as never,
            { week: weekNumber, scheduledDate: scheduled } as CohortWeek,
            1,
        );
    };

    describe.each(inhouseConfigs)('%s', (file) => {
        it('anchors every exercise to graduation', () => {
            const config = load(file);

            const anchors = config.weeks
                .map((week, index) => ({ week, number: index + 1 }))
                .filter(({ week }) => week.assignment)
                .map(({ week, number }) => ({
                    slug: week.assignment!.slug,
                    source: seed(week.assignment!, number).deadlineSource,
                }));

            expect(anchors).not.toHaveLength(0);
            for (const anchor of anchors) {
                expect(anchor).toEqual({
                    slug: anchor.slug,
                    source: AssignmentDeadlineSource.GRADUATION,
                });
            }
            // An exercise week with no assignment block would pass above by
            // being skipped; boot validation rejects that, and this keeps the
            // two in agreement.
            expect(anchors).toHaveLength(
                config.weeks.filter((w) => w.hasExercise).length,
            );
        });

        it('lands on graduation day wherever graduation is', () => {
            const config = load(file);

            // Two unrelated schedules: the deadline has to track graduation,
            // not the week it was seeded against.
            for (const graduationDay of ['2026-05-04', '2027-11-22']) {
                const graduation = new Date(`${graduationDay}T00:00:00.000Z`);
                const expected = new Date(graduation);
                expected.setUTCHours(18, 29, 59, 999); // 23:59:59.999 IST

                config.weeks.forEach((week, index) => {
                    if (!week.assignment) return;
                    const assignment = seed(week.assignment, index + 1);

                    const deadline = resolveDeadline(
                        assignment.deadlineSource,
                        { week: index + 1 } as never,
                        graduation,
                        assignment.deadlineDaysAfterWeek,
                    );

                    expect({
                        slug: week.assignment.slug,
                        deadline: deadline?.toISOString(),
                    }).toEqual({
                        slug: week.assignment.slug,
                        deadline: expected.toISOString(),
                    });
                });
            }
        });
    });
});
