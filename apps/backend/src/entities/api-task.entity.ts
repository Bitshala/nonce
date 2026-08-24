import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '@/entities/base.entity';
import { APITaskStatus, TaskType } from '@/task-processor/task.enums';
import { TaskData } from '@/task-processor/task.types';

// The task poller (task-processor.service.ts) runs every 10 seconds against the
// two branches of its OR. Terminal rows are never deleted, so ~93% of this table
// is PROCESSED and can never match. Partial indexes keep the scanned set sized to
// the pending backlog rather than the full history.
@Entity()
@Index(['executeOnTime', 'updatedAt'], {
    where: `"status" = 'UNPROCESSED'`,
})
@Index(['lastRetryTime', 'updatedAt'], { where: `"status" = 'FAILED'` })
export class APITask<T extends TaskType> extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: false,
    })
    type: T;

    @Column({
        type: 'enum',
        enum: APITaskStatus,
        default: APITaskStatus.UNPROCESSED,
        nullable: false,
    })
    status: APITaskStatus;

    @Column('jsonb')
    data: TaskData<T>;

    @Column({
        type: 'timestamp with time zone',
        nullable: true,
    })
    processStartTime: Date;

    @Column({
        type: 'integer',
        default: 0,
    })
    retryCount: number;

    @Column({
        type: 'integer',
        default: 3,
    })
    retryLimit: number;

    @Column({ type: 'text', nullable: true })
    lastExecutionFailureDetails: string;

    @Column({ type: 'timestamp with time zone', nullable: true })
    lastRetryTime: Date;

    @Column({
        type: 'timestamp with time zone',
        default: () => 'now()',
    })
    executeOnTime: Date;
}
