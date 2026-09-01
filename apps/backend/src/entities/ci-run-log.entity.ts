import {
    Column,
    Entity,
    JoinColumn,
    OneToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '@/entities/base.entity';
import { CIRun } from '@/entities/ci-run.entity';

/** Stored logs are capped; the middle is dropped and the tail kept. */
export const MAX_LOG_BYTES = 2 * 1024 * 1024;

/**
 * The grader job's console output, split out of `CIRun` so run rows stay small
 * enough to list cheaply. Written once, when the run completes.
 */
@Entity()
export class CIRunLog extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @OneToOne(() => CIRun, (r) => r.log, { onDelete: 'CASCADE' })
    @JoinColumn()
    ciRun!: CIRun;

    @Column('text')
    content!: string;

    // Size of the original log, before truncation.
    @Column('int')
    sizeBytes!: number;

    @Column('boolean', { default: false })
    truncated!: boolean;
}
