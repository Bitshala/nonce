import { applyAssignmentConfig } from '@/assignments/assignment-seed.util';
import { Assignment } from '@/entities/assignment.entity';
import { AssignmentConfig } from '@/cohorts/cohorts.config.model';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { AssignmentStatus } from '@/common/enum';

// Assignments are authored in config and seeded here, so this function decides
// what every student's repository is named and when their deadline lands.
describe('assignment-seed.util — applyAssignmentConfig', () => {
    const week = {
        id: 'week-3',
        week: 3,
        scheduledDate: new Date('2026-03-02T00:00:00.000Z'),
    } as CohortWeek;

    const config: AssignmentConfig = {
        slug: 'pb-week-3',
        templateOwner: 'bitshala',
        templateRepo: 'pb-week-3-template',
        graderTestPath: 'tests/pb-week-3',
    };

    it('stamps the season into the slug so repos stay unique across seasons', () => {
        // Repos are named `<slug>-<userId>`. Without the season a student who
        // retakes a cohort would collide with their own earlier repository.
        const assignment = applyAssignmentConfig(
            new Assignment(),
            config,
            week,
            4,
        );

        expect(assignment.slug).toBe('pb-week-3-s4');
    });

    it('resolves the deadline to end-of-day IST on the offset day', () => {
        const assignment = applyAssignmentConfig(
            new Assignment(),
            { ...config, deadlineDaysAfterWeek: 7 },
            week,
            4,
        );

        // 23:59:59.999 IST on 9 March == 18:29:59.999 UTC, matching how
        // registrationDeadline is normalised at cohort creation.
        expect(assignment.deadline?.toISOString()).toBe(
            '2026-03-09T18:29:59.999Z',
        );
    });

    it('leaves the deadline null when config specifies no offset', () => {
        // No deadline means every run counts for score, which is the right
        // default for an assignment that is not time-boxed.
        const assignment = applyAssignmentConfig(
            new Assignment(),
            config,
            week,
            4,
        );

        expect(assignment.deadline).toBeNull();
    });

    it('applies the documented defaults', () => {
        const assignment = applyAssignmentConfig(
            new Assignment(),
            config,
            week,
            4,
        );

        expect(assignment.status).toBe(AssignmentStatus.PUBLISHED);
        expect(assignment.allowLateSubmission).toBe(true);
        expect(assignment.protectedPaths).toEqual(['.github/**']);
        expect(assignment.maxRunsPerDay).toBe(50);
        expect(assignment.runTimeoutMinutes).toBe(10);
        expect(assignment.graderWorkflowPath).toBe(
            '.github/workflows/grade.yml',
        );
        expect(assignment.templateRef).toBeNull();
    });

    it('lets config override every default', () => {
        const assignment = applyAssignmentConfig(
            new Assignment(),
            {
                ...config,
                templateRef: 'v2',
                graderWorkflowPath: '.github/workflows/rust.yml',
                protectedPaths: ['.github/**', 'Cargo.lock'],
                allowLateSubmission: false,
                maxRunsPerDay: 20,
                runTimeoutMinutes: 25,
            },
            week,
            4,
        );

        expect(assignment.templateRef).toBe('v2');
        expect(assignment.graderWorkflowPath).toBe(
            '.github/workflows/rust.yml',
        );
        expect(assignment.protectedPaths).toEqual(['.github/**', 'Cargo.lock']);
        expect(assignment.allowLateSubmission).toBe(false);
        expect(assignment.maxRunsPerDay).toBe(20);
        expect(assignment.runTimeoutMinutes).toBe(25);
    });

    it('does not share the default protectedPaths array between assignments', () => {
        // A shared array reference would let editing one assignment's protected
        // paths silently change every other assignment's.
        const first = applyAssignmentConfig(new Assignment(), config, week, 4);
        const second = applyAssignmentConfig(new Assignment(), config, week, 5);

        first.protectedPaths.push('extra/**');

        expect(second.protectedPaths).toEqual(['.github/**']);
    });

    it('updates an existing assignment in place, for the admin re-sync path', () => {
        const existing = new Assignment();
        existing.id = 'assignment-1';
        existing.maxRunsPerDay = 5;

        const result = applyAssignmentConfig(existing, config, week, 4);

        expect(result).toBe(existing);
        expect(result.id).toBe('assignment-1');
        expect(result.maxRunsPerDay).toBe(50);
    });
});

describe('Assignment — isPastDeadline', () => {
    it('is never past when there is no deadline', () => {
        const assignment = new Assignment();
        assignment.deadline = null;

        expect(assignment.isPastDeadline(new Date('2030-01-01'))).toBe(false);
    });

    it('is not past at the exact deadline instant', () => {
        // The boundary decides whether a run counts for score, so "at the
        // deadline" has to mean "still on time".
        const assignment = new Assignment();
        assignment.deadline = new Date('2026-03-09T18:29:59.999Z');

        expect(
            assignment.isPastDeadline(new Date('2026-03-09T18:29:59.999Z')),
        ).toBe(false);
        expect(
            assignment.isPastDeadline(new Date('2026-03-09T18:30:00.000Z')),
        ).toBe(true);
    });
});
