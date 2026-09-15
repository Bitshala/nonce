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
import { AssignmentStatus } from '@/common/enum';

/** Editor writes to these paths are refused. Grading config must stay ours. */
export const DEFAULT_PROTECTED_PATHS = ['.github/**'];

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
}
