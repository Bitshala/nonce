import {
    Column,
    Entity,
    Index,
    JoinColumn,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '@/entities/base.entity';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { AssignmentDeadlineSource, AssignmentStatus } from '@/common/enum';

/**
 * Editor writes to these paths are refused. Grading config must stay ours.
 *
 * `.github/**` keeps student code out of CI. The rest is the test harness every
 * template ships so students can run the suite locally — the specs themselves,
 * the jest config that decides which files are specs, and the root manifest
 * that pins the runner. Per-language dependencies live in `<language>/package.json`,
 * which stays writable; the root one is ours.
 *
 * Refusing the write is the courteous half of this. The grader also restores
 * all of it from the suite's own `fixtures/` before running, so a student who
 * finds a way around this list gains nothing — see grader/lib/grade-lib.sh.
 * An assignment that needs a different set overrides `protectedPaths` in its
 * cohort config.
 */
export const DEFAULT_PROTECTED_PATHS = [
    '.github/**',
    'test/**',
    'jest.config.ts',
    'tsconfig.json',
    'package.json',
    'package-lock.json',
];

/**
 * The mechanics of one week's exercise: where the starter code comes from,
 * which grader runs it, and what limits apply.
 *
 * Deliberately holds no prose. The human-readable problem statement stays on
 * `CohortWeek.exercise`, which already carries title/concepts/problem/
 * expectedOutput and is what the instructions page renders.
 */
@Entity()
// Repos are named `<slug>-<userId>`, so a duplicate slug would collide across
// cohorts. Failing at seed time beats discovering it during provisioning.
@Index(['slug'], { unique: true })
export class Assignment extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @OneToOne(() => CohortWeek, (cw) => cw.assignment, { onDelete: 'CASCADE' })
    @JoinColumn()
    cohortWeek!: CohortWeek;

    @Column('text')
    slug!: string;

    @Column('text')
    templateOwner!: string;

    @Column('text')
    templateRepo!: string;

    // Branch or tag of the template to instantiate. Null means its default branch.
    @Column('text', { nullable: true })
    templateRef!: string | null;

    @Column('text')
    graderWorkflowPath!: string;

    // Path within the grader repo holding this assignment's test suite. Passed
    // to the workflow so the grader does not have to map slugs to paths.
    @Column('text')
    graderTestPath!: string;

    @Column({
        type: 'enum',
        enum: AssignmentStatus,
        default: AssignmentStatus.DRAFT,
    })
    status!: AssignmentStatus;

    // What the deadline is anchored to. Kept on the row because `deadline`
    // below is derived: cohort dates get moved after a cohort exists, and the
    // rule has to still be here to recompute from.
    @Column({
        type: 'enum',
        enum: AssignmentDeadlineSource,
        default: AssignmentDeadlineSource.NONE,
    })
    deadlineSource!: AssignmentDeadlineSource;

    // Only meaningful for WEEK_OFFSET.
    @Column('int', { nullable: true })
    deadlineDaysAfterWeek!: number | null;

    /**
     * The materialised deadline. Derived from `deadlineSource` — recomputed by
     * `CohortsService.syncAssignmentDeadlines` whenever a week date moves, so
     * a rescheduled graduation drags every deadline with it.
     *
     * Stored rather than computed on read because it is consulted on every
     * save and every run, and deriving it would mean loading the cohort's whole
     * week list at each of those call sites.
     */
    @Column('timestamptz', { nullable: true })
    deadline!: Date | null;

    // Whether accept/save/run remain *permitted* after the deadline. Separate
    // from score eligibility, which is always "dispatched at or before the
    // deadline" — a late run can pass without changing the score.
    @Column('boolean', { default: true })
    allowLateSubmission!: boolean;

    @Column('jsonb', { default: DEFAULT_PROTECTED_PATHS })
    protectedPaths!: string[];

    @Column('int', { default: 50 })
    maxRunsPerDay!: number;

    @Column('int', { default: 10 })
    runTimeoutMinutes!: number;

    @OneToMany(() => AssignmentSubmission, (s) => s.assignment)
    submissions!: AssignmentSubmission[];

    /** Whether the deadline has passed. Assignments without one never expire. */
    isPastDeadline(at: Date = new Date()): boolean {
        return this.deadline !== null && at > this.deadline;
    }

    /**
     * Whether students may still accept, save, and run. The single definition
     * of that rule — the API gates on it and the frontend reads it off the DTO.
     *
     * Not the same as score eligibility, which stays "dispatched before the
     * deadline" even when late work is allowed (see `CIRun.countsForScore`).
     */
    isOpenForSubmission(at: Date = new Date()): boolean {
        return (
            this.status !== AssignmentStatus.CLOSED &&
            (!this.isPastDeadline(at) || this.allowLateSubmission)
        );
    }
}
