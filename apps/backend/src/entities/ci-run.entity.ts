import {
    Column,
    Entity,
    Index,
    ManyToOne,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '@/entities/base.entity';
import { AssignmentSubmission } from '@/entities/assignment-submission.entity';
import { CIRunLog } from '@/entities/ci-run-log.entity';
import { User } from '@/entities/user.entity';
import { CIRunConclusion, CIRunStatus } from '@/common/enum';

/** One step of one job, mirrored from `workflow_job` for the UI checklist. */
export interface CIRunJobStep {
    name: string;
    status: string;
    conclusion: string | null;
    number: number;
}

export interface CIRunJob {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    startedAt: string | null;
    completedAt: string | null;
    steps: CIRunJobStep[];
}

/** One test as reported by the grader. */
export interface GradingReportTest {
    name: string;
    status: string;
    durationMs?: number;
    message?: string;
}

/** The grading contract, parsed from the run's `report.json` artifact. */
export interface GradingReport {
    schemaVersion: number;
    passed: boolean;
    tests: GradingReportTest[];
}

const TERMINAL_STATUSES: CIRunStatus[] = [
    CIRunStatus.COMPLETED,
    CIRunStatus.ORPHANED,
];

/**
 * One press of Run: a dispatch of the grading workflow against one commit.
 *
 * `workflow_dispatch` answers 204 with no body, so there is no run id to record
 * at dispatch time. `correlationToken` is echoed in the workflow's `run-name`
 * and is how the GitHub run is later matched back to this row.
 */
@Entity()
@Index(['submission'])
@Index(['correlationToken'], { unique: true })
// Drives RECONCILE_CI_RUN, which sweeps runs that webhooks never finished.
@Index(['dispatchedAt'], {
    where: `"status" NOT IN ('COMPLETED', 'ORPHANED')`,
})
export class CIRun extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => AssignmentSubmission, (s) => s.runs, {
        onDelete: 'CASCADE',
    })
    submission!: AssignmentSubmission;

    @ManyToOne(() => User)
    triggeredByUser!: User;

    // Run always targets an explicit commit, never "latest".
    @Column('text')
    commitSha!: string;

    @Column('uuid')
    correlationToken!: string;

    // bigint: GitHub run ids exceed 2^31. TypeORM maps bigint to string in JS.
    @Column('bigint', { nullable: true })
    githubRunId!: string | null;

    @Column('int', { default: 1 })
    githubRunAttempt!: number;

    @Column({
        type: 'enum',
        enum: CIRunStatus,
        default: CIRunStatus.DISPATCHING,
    })
    status!: CIRunStatus;

    @Column({ type: 'enum', enum: CIRunConclusion, nullable: true })
    conclusion!: CIRunConclusion | null;

    @Column('jsonb', { default: [] })
    jobs!: CIRunJob[];

    @Column('jsonb', { nullable: true })
    report!: GradingReport | null;

    @Column('int', { nullable: true })
    testsPassed!: number | null;

    @Column('int', { nullable: true })
    testsTotal!: number | null;

    // Frozen at dispatch from the deadline check. A run started after the
    // deadline still runs and still shows results, but cannot change the score.
    @Column('boolean', { default: true })
    countsForScore!: boolean;

    @Column('timestamptz')
    dispatchedAt!: Date;

    @Column('timestamptz', { nullable: true })
    startedAt!: Date | null;

    @Column('timestamptz', { nullable: true })
    completedAt!: Date | null;

    @OneToOne(() => CIRunLog, (l) => l.ciRun)
    log!: CIRunLog | null;

    get isTerminal(): boolean {
        return TERMINAL_STATUSES.includes(this.status);
    }

    get isPassing(): boolean {
        return this.conclusion === CIRunConclusion.SUCCESS;
    }
}
