import { Assignment } from '@/entities/assignment.entity';
import { AssignmentStatus } from '@/common/enum';

// Accepting, saving, running, and the frontend's Accept button all read this
// one rule, so a change to it (a grace period, say) lands everywhere at once.
describe('Assignment.isOpenForSubmission', () => {
    const DAY = 24 * 60 * 60 * 1000;
    const build = (overrides: Partial<Assignment>): Assignment =>
        Object.assign(new Assignment(), {
            status: AssignmentStatus.PUBLISHED,
            deadline: null,
            allowLateSubmission: false,
            ...overrides,
        });

    it('is open before the deadline', () => {
        expect(
            build({
                deadline: new Date(Date.now() + DAY),
            }).isOpenForSubmission(),
        ).toBe(true);
    });

    it('is open with no deadline at all', () => {
        expect(build({}).isOpenForSubmission()).toBe(true);
    });

    it('closes at the deadline unless late work is allowed', () => {
        const past = new Date(Date.now() - DAY);

        expect(build({ deadline: past }).isOpenForSubmission()).toBe(false);
        expect(
            build({
                deadline: past,
                allowLateSubmission: true,
            }).isOpenForSubmission(),
        ).toBe(true);
    });

    it('is shut once the assignment is closed, deadline or not', () => {
        expect(
            build({
                status: AssignmentStatus.CLOSED,
                allowLateSubmission: true,
            }).isOpenForSubmission(),
        ).toBe(false);
    });
});
