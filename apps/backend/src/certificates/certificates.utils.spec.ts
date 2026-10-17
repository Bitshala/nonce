import { isEligibleForCertificate } from '@/certificates/certificates.utils';
import { CohortType } from '@/common/enum';

/**
 * Programming Bitcoin allows two missed group discussions. A cohort has seven
 * of them between orientation (week 0) and graduation (week 8).
 */
describe('isEligibleForCertificate', () => {
    const attended = (total: number, max = 7) => ({
        totalGroupDiscussionAttendance: total,
        maxGroupDiscussionAttendance: max,
    });

    it('passes a participant who attended every group discussion', () => {
        expect(
            isEligibleForCertificate(
                attended(7),
                CohortType.PROGRAMMING_BITCOIN,
            ),
        ).toBe(true);
    });

    it('passes a participant exactly at the absence threshold', () => {
        expect(
            isEligibleForCertificate(
                attended(5),
                CohortType.PROGRAMMING_BITCOIN,
            ),
        ).toBe(true);
    });

    it('fails a participant one absence past the threshold', () => {
        expect(
            isEligibleForCertificate(
                attended(4),
                CohortType.PROGRAMMING_BITCOIN,
            ),
        ).toBe(false);
    });

    it('applies the per-cohort-type threshold', () => {
        // Learning Bitcoin from the Command Line allows only one absence.
        expect(
            isEligibleForCertificate(
                attended(5),
                CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE,
            ),
        ).toBe(false);
        expect(
            isEligibleForCertificate(
                attended(6),
                CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE,
            ),
        ).toBe(true);
    });
});
