import { LeaderboardEntryDto } from '@/scores/scores.response.dto';
import { Attendance } from '@/entities/attendance.entity';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { User } from '@/entities/user.entity';
import { CohortWeekType } from '@/common/enum';

/**
 * Certificate eligibility reads the group discussion attendance figures, so
 * orientation (week 0) and graduation (week 8) must not move them.
 */
describe('LeaderboardEntryDto.fromUserWithScores — attendance', () => {
    const weekType = (week: number): CohortWeekType => {
        if (week === 0) return CohortWeekType.ORIENTATION;
        if (week === 8) return CohortWeekType.GRADUATION;
        return CohortWeekType.GROUP_DISCUSSION;
    };

    // One attendance record per week 0..8, present for the weeks listed.
    const userAttending = (attendedWeeks: number[]): User =>
        ({
            id: 'u1',
            attendances: Array.from({ length: 9 }, (_, week) =>
                Object.assign(new Attendance(), {
                    attended: attendedWeeks.includes(week),
                    cohortWeek: { week, type: weekType(week) } as CohortWeek,
                }),
            ),
            groupDiscussionScores: [],
            exerciseScores: [],
        }) as unknown as User;

    it('counts only group discussion weeks in the total', () => {
        const entry = LeaderboardEntryDto.fromUserWithScores(userAttending([]));

        expect(entry.maxGroupDiscussionAttendance).toBe(7);
        expect(entry.maxAttendance).toBe(9);
    });

    it('gives full attendance to someone who attended every regular week and skipped orientation and graduation', () => {
        const entry = LeaderboardEntryDto.fromUserWithScores(
            userAttending([1, 2, 3, 4, 5, 6, 7]),
        );

        expect(entry.totalGroupDiscussionAttendance).toBe(7);
        expect(entry.maxGroupDiscussionAttendance).toBe(7);
    });

    it('ignores attendance at orientation and graduation', () => {
        const without = LeaderboardEntryDto.fromUserWithScores(
            userAttending([1, 2, 3, 4]),
        );
        const withBoth = LeaderboardEntryDto.fromUserWithScores(
            userAttending([0, 1, 2, 3, 4, 8]),
        );

        expect(withBoth.totalGroupDiscussionAttendance).toBe(4);
        expect(withBoth.totalGroupDiscussionAttendance).toBe(
            without.totalGroupDiscussionAttendance,
        );
        expect(withBoth.maxGroupDiscussionAttendance).toBe(
            without.maxGroupDiscussionAttendance,
        );
    });
});
