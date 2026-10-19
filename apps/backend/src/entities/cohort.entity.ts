import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToMany,
    ManyToOne,
    Unique,
} from 'typeorm';
import { CohortWeek } from '@/entities/cohort-week.entity';
import { GroupDiscussionScore } from '@/entities/group-discussion-score.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { Attendance } from '@/entities/attendance.entity';
import { BaseEntity } from '@/entities/base.entity';
import { AssignmentBackend, CohortType, UserRole } from '@/common/enum';
import { Certificate } from '@/entities/certificate.entity';
import { CohortMembership } from '@/entities/cohort-membership.entity';
import { ServiceError } from '@/common/errors';
import { User } from '@/entities/user.entity';

export interface Link {
    label: string;
    url: string;
    // Minimum role required to see this link. Absent => visible to everyone.
    minRole?: UserRole;
}

/**
 * A cohort that GitHub Classroom graded before it was switched to the in-house
 * classroom. Its Classroom results are frozen in `ClassroomResultSnapshot`,
 * and in-house grading may only add to them.
 *
 * Read from the explicit switch record rather than inferred from
 * `assignmentBackend` and `classroomId`: those are ordinary fields a restore
 * or a manual fix could change, and this flag changes how scores are derived.
 */
export function isSwitchedFromClassroom(
    cohort: Pick<Cohort, 'switchedFromClassroomAt'>,
): boolean {
    return cohort.switchedFromClassroomAt != null;
}

@Entity()
@Unique(['type', 'season'])
export class Cohort extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'enum', enum: CohortType })
    type!: CohortType;

    @Column('int')
    season!: number;

    @Column('timestamptz')
    registrationDeadline!: Date;

    @Column('timestamptz')
    startDate!: Date;

    @Column('boolean')
    hasExercises!: boolean;

    @Column('text', { nullable: true })
    classroomId!: string | null;

    // Which exercise system backs this cohort. Existing cohorts stay on
    // CLASSROOM; the in-house classroom is rolled out one cohort at a time.
    @Column({
        type: 'enum',
        enum: AssignmentBackend,
        default: AssignmentBackend.CLASSROOM,
    })
    assignmentBackend!: AssignmentBackend;

    // The audit record of the one-way switch from GitHub Classroom, set in the
    // switch's own transaction. Null on cohorts that never switched, including
    // native in-house ones.
    @Column('timestamptz', { nullable: true })
    switchedFromClassroomAt!: Date | null;

    // Who switched it. Kept if that admin's account goes, minus the link.
    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    switchedFromClassroomBy!: User | null;

    // Instruction-sheet links (global + course-specific). Seeded from config at
    // creation, editable per cohort. minRole gates visibility (filtered at read).
    @Column('jsonb', { default: [] })
    links!: Link[];

    getEndDate(): Date {
        if (this.weeks === undefined || this.weeks === null) {
            throw new ServiceError(
                'Cohort weeks not loaded. Ensure that the cohort entity is loaded with its weeks relation.',
            );
        }

        return this.weeks.reduce(
            (max, week) =>
                week.scheduledDate > max ? week.scheduledDate : max,
            this.weeks[0].scheduledDate,
        );
    }

    @OneToMany(() => CohortMembership, (m) => m.cohort)
    memberships!: CohortMembership[];

    @OneToMany(() => CohortWeek, (cw) => cw.cohort)
    weeks!: CohortWeek[];

    @OneToMany(() => GroupDiscussionScore, (gds) => gds.cohort)
    groupDiscussionScores!: GroupDiscussionScore[];

    @OneToMany(() => Attendance, (a) => a.cohort)
    attendances!: Attendance[];

    @OneToMany(() => ExerciseScore, (es) => es.cohort)
    exerciseScores!: ExerciseScore[];

    @OneToMany(() => Certificate, (c) => c.cohort)
    certificates!: Certificate[];
}
