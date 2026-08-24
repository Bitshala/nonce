import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    Index,
    Unique,
} from 'typeorm';
import { User } from '@/entities/user.entity';
import { Cohort } from '@/entities/cohort.entity';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { BaseEntity } from '@/entities/base.entity';
import { SCALING_FACTOR } from '@/common/constants';

@Entity()
@Unique(['user', 'cohort', 'cohortWeek'])
// The unique above only serves userId-leading lookups. Scoreboards read by week
// and the leaderboard reads by cohort.
@Index(['cohortWeek', 'user'])
@Index(['cohort', 'user'])
export class Attendance extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('boolean', { default: false })
    attended!: boolean;

    @ManyToOne(() => User, (u) => u.attendances)
    user!: User;

    @ManyToOne(() => Cohort, (c) => c.attendances)
    cohort!: Cohort;

    @ManyToOne(() => CohortWeek, (cw) => cw.attendances)
    cohortWeek!: CohortWeek;

    get scaledAttendanceScore(): number {
        return this.attended ? SCALING_FACTOR.ATTENDANCE : 0;
    }

    get maxScaledAttendanceScore(): number {
        return SCALING_FACTOR.ATTENDANCE;
    }
}
