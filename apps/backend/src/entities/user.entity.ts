import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    OneToMany,
} from 'typeorm';
import { GroupDiscussionScore } from '@/entities/group-discussion-score.entity';
import { ExerciseScore } from '@/entities/exercise-score.entity';
import { Attendance } from '@/entities/attendance.entity';
import { BaseEntity } from '@/entities/base.entity';
import { UserRole } from '@/common/enum';
import { CohortWaitlist } from '@/entities/cohort-waitlist.entity';
import { Certificate } from '@/entities/certificate.entity';
import { FellowshipApplication } from '@/entities/fellowship-application.entity';
import { Fellowship } from '@/entities/fellowship.entity';
import { CohortMembership } from '@/entities/cohort-membership.entity';

@Entity()
// Three admin list endpoints search these four columns with ILIKE '%term%'. A
// leading wildcard rules out B-tree, so in the database these are pg_trgm GIN
// indexes -- see the follow-up migration that swaps them. TypeORM cannot express
// an operator class, so they are declared plain here; its schema diff compares
// name, columns and uniqueness but never the access method, so the swap sticks.
@Index(['name'])
@Index(['email'])
@Index(['discordUserName'])
@Index(['discordGlobalName'])
export class User extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('text', { unique: true, nullable: true })
    email!: string | null;

    @Column('text', { unique: true })
    discordUserId!: string;

    @Column('text')
    discordUserName!: string;

    @Column('text', { nullable: true })
    discordGlobalName!: string | null;

    @Column('boolean', { default: false })
    isGuildMember!: boolean;

    @Column('varchar', { nullable: true })
    name!: string | null;

    @Column({ type: 'enum', enum: UserRole })
    role!: UserRole;

    @Column('varchar', { nullable: true })
    description!: string | null;

    @Column('text', { nullable: true })
    background!: string | null;

    @Column('varchar', { length: 2048, nullable: true })
    githubProfileUrl!: string | null;

    @Column('varchar', { length: 2048, nullable: true })
    portfolioUrl!: string | null;

    @Column('varchar', { length: 2048, nullable: true })
    linkedinProfileUrl!: string | null;

    @Column({ type: 'jsonb', default: [] })
    skills!: string[];

    @Column({ type: 'date', nullable: true })
    firstHeardAboutBitcoinOn!: string | null;

    @Column({ type: 'jsonb', default: [] })
    bitcoinBooksRead!: string[];

    @Column('text', { nullable: true })
    whyBitcoin!: string | null;

    @Column('int', { nullable: true })
    weeklyCohortCommitmentHours!: number | null;

    @Column('varchar', { length: 255, nullable: true })
    location!: string | null;

    @Column('varchar', { length: 255, nullable: true })
    referral!: string | null;

    @OneToMany(() => CohortMembership, (m) => m.user)
    cohortMemberships!: CohortMembership[];

    @OneToMany(() => GroupDiscussionScore, (gds) => gds.user)
    groupDiscussionScores!: GroupDiscussionScore[];

    @OneToMany(() => Attendance, (a) => a.user)
    attendances!: Attendance[];

    @OneToMany(() => ExerciseScore, (es) => es.user)
    exerciseScores!: ExerciseScore[];

    @OneToMany(() => CohortWaitlist, (cwl) => cwl.user)
    cohortsWaitlist!: CohortWaitlist[];

    @OneToMany(
        () => GroupDiscussionScore,
        (gds) => gds.assignedTeachingAssistant,
    )
    assignedGroupDiscussionScores!: GroupDiscussionScore[];

    @OneToMany(() => Certificate, (c) => c.user)
    certificates!: Certificate[];

    @OneToMany(() => FellowshipApplication, (fa) => fa.applicant)
    fellowshipApplications!: FellowshipApplication[];

    @OneToMany(() => Fellowship, (f) => f.user)
    fellowships!: Fellowship[];

    get displayName(): string {
        return this.name || this.discordGlobalName || this.discordUserName;
    }
}
