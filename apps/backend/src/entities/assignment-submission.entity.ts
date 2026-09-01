import {
    Column,
    Entity,
    Index,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    Unique,
} from 'typeorm';
import { BaseEntity } from '@/entities/base.entity';
import { Assignment } from '@/entities/assignment.entity';
import { CIRun } from '@/entities/ci-run.entity';
import { User } from '@/entities/user.entity';
import { ProvisionStatus } from '@/common/enum';

/**
 * One student's attempt at one assignment, and the private repository backing
 * it. The student holds no GitHub credentials for that repository — our API is
 * the only writer — so this row is the authoritative record of its state.
 */
@Entity()
// One repo per student per assignment. The constraint is also what makes a
// double-clicked Accept idempotent.
@Unique(['assignment', 'user'])
@Index(['assignment'])
export class AssignmentSubmission extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Assignment, (a) => a.submissions, { onDelete: 'CASCADE' })
    assignment!: Assignment;

    @ManyToOne(() => User)
    user!: User;

    // Repo coordinates are null until PROVISION_ASSIGNMENT_REPO succeeds.
    @Column('text', { nullable: true })
    repoOwner!: string | null;

    @Column('text', { nullable: true })
    repoName!: string | null;

    @Column('text', { nullable: true })
    repoNodeId!: string | null;

    @Column('text', { default: 'main' })
    defaultBranch!: string;

    @Column({
        type: 'enum',
        enum: ProvisionStatus,
        default: ProvisionStatus.PENDING,
    })
    provisionStatus!: ProvisionStatus;

    @Column('text', { nullable: true })
    provisionError!: string | null;

    @Column('timestamptz')
    acceptedAt!: Date;

    // The template's own first commit. Anything past it is the student's work,
    // which is how `ExerciseScore.isSubmitted` is decided.
    @Column('text', { nullable: true })
    initialCommitSha!: string | null;

    @Column('text', { nullable: true })
    lastCommitSha!: string | null;

    @Column('timestamptz', { nullable: true })
    lastCommitAt!: Date | null;

    // The run that decides the score: the first score-eligible run to conclude
    // SUCCESS. Set once and never overwritten, which is what makes "best run
    // wins" monotonic — a later failing run cannot take a pass away.
    @ManyToOne(() => CIRun, { nullable: true })
    bestRun!: CIRun | null;

    @ManyToOne(() => CIRun, { nullable: true })
    latestRun!: CIRun | null;

    @OneToMany(() => CIRun, (r) => r.submission)
    runs!: CIRun[];

    get repoFullName(): string | null {
        if (!this.repoOwner || !this.repoName) return null;
        return `${this.repoOwner}/${this.repoName}`;
    }

    get repoHtmlUrl(): string | null {
        const fullName = this.repoFullName;
        return fullName ? `https://github.com/${fullName}` : null;
    }

    /** True once the student has committed anything beyond the template. */
    get hasStudentCommits(): boolean {
        return (
            this.lastCommitSha !== null &&
            this.lastCommitSha !== this.initialCommitSha
        );
    }
}
