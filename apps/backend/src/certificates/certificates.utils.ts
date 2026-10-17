import { CohortType } from '@/common/enum';
import { ABSENCE_THRESHOLD_DAYS } from '@/certificates/certificates.constants';
import { LeaderboardEntryDto } from '@/scores/scores.response.dto';

/**
 * Helper function to generate certificate file name
 * @param userId - The user ID
 * @param cohortType - The cohort type
 * @returns The certificate file name
 */
export function generateCertificateFileName(
    userId: string,
    cohortType: CohortType,
): string {
    return `${userId}_${cohortType.toLowerCase()}.pdf`;
}

/**
 * Helper function to format certificate date
 * @param date - The date to format
 * @returns The formatted date string
 */
export function formatCertificateDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Whether a participant attended enough to earn a certificate. Only group
 * discussion weeks count, so orientation and graduation are left out of both
 * the attended count and the total.
 * @param entry - The participant's leaderboard entry
 * @param cohortType - The cohort type, which sets how many absences are allowed
 * @returns True if the participant missed no more than the allowed number of weeks
 */
export function isEligibleForCertificate(
    entry: Pick<
        LeaderboardEntryDto,
        'totalGroupDiscussionAttendance' | 'maxGroupDiscussionAttendance'
    >,
    cohortType: CohortType,
): boolean {
    return (
        entry.totalGroupDiscussionAttendance >=
        entry.maxGroupDiscussionAttendance - ABSENCE_THRESHOLD_DAYS[cohortType]
    );
}
