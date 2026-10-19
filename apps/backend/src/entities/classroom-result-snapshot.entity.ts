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

/**
 * A student's GitHub Classroom result for one week, frozen when their cohort
 * switched to the in-house classroom (`createdAt` is the moment of the
 * switch). Written once, in the switch's transaction, and never updated.
 *
 * After the switch this is the Classroom result, not the `ExerciseScore`
 * row: that row is also written by staff pins and in-house runs, so it cannot
 * say which part of it came from Classroom. Deliberately not tied to
 * `CohortMembership`, so removing a student and adding them back restores it.
 */
@Entity()
@Unique(['user', 'cohortWeek'])
@Index(['cohort'])
export class ClassroomResultSnapshot extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User, { nullable: false })
    user!: User;

    @ManyToOne(() => Cohort, { nullable: false, onDelete: 'CASCADE' })
    cohort!: Cohort;

    @ManyToOne(() => CohortWeek, { nullable: false, onDelete: 'CASCADE' })
    cohortWeek!: CohortWeek;

    @Column('boolean')
    isSubmitted!: boolean;

    @Column('boolean')
    isPassing!: boolean;

    @Column('text', { nullable: true })
    classroomRepositoryUrl!: string | null;
}
