import { CohortType, UserRole, ComponentRating, CohortComponent, OpportunityInterest, FellowshipInterest } from '@nonce/shared';

// The pagination envelope, cohort shapes, and cohort request bodies now live in
// @nonce/shared, where the backend DTO classes `implements` them — so a backend
// change that isn't mirrored here is a compile error rather than something the
// UI discovers at runtime.
//
// They are re-exported under this file's existing *Dto names so the 25 modules
// importing from '../types/api' are unchanged. Prefer importing from
// '@nonce/shared' directly in new code.
export type {
  PaginatedQuery as PaginatedQueryDto,
  PaginatedData as PaginatedDataDto,
  CohortWeekQuestion,
  ReadingMaterialLink,
  CohortLink as CohortQuickLink,
  CohortWeekExercise,
  GetCohortWeekResponse as GetCohortWeekResponseDto,
  GetCohortResponse as GetCohortResponseDto,
  PublicCohortResponse as PublicCohortResponseDto,
  ListAvailableCohortsResponse as ListAvailableCohortsResponseDto,
  UserCohortWaitlistResponse as UserCohortWaitlistResponseDto,
  UpdateCohortRequest as UpdateCohortRequestDto,
  CreateCohortRequest as CreateCohortRequestDto,
  UpdateCohortWeekRequest as UpdateCohortWeekRequestDto,
  JoinWaitlistRequest as JoinWaitlistRequestDto,
} from '@nonce/shared';

// CohortWeekType was a string union here and an enum on the backend; the shared
// enum is now the single definition. Re-exported as a value since call sites
// compare against it.
export { CohortWeekType } from '@nonce/shared';

export interface UpdateScoresRequestDto {
  attendance?: boolean;
  communicationScore?: number;
  depthOfAnswerScore?: number;
  technicalBitcoinFluencyScore?: number;
  engagementScore?: number;
  isBonusAttempted?: boolean;
  bonusAnswerScore?: number;
  bonusFollowupScore?: number;
  isSubmitted?: boolean;
  isPassing?: boolean;
  groupNumber?: number;
  teachingAssistantId?: string;
}


export interface GroupDiscussionScore {
  id: string;
  attendance: boolean;
  communicationScore: number;
  maxCommunicationScore: number;
  depthOfAnswerScore: number;
  maxDepthOfAnswerScore: number;
  technicalBitcoinFluencyScore: number;
  maxTechnicalBitcoinFluencyScore: number;
  engagementScore: number;
  maxEngagementScore: number;
  isBonusAttempted: boolean;
  bonusAnswerScore: number;
  maxBonusAnswerScore: number;
  bonusFollowupScore: number;
  maxBonusFollowupScore: number;
  totalScore: number;
  maxTotalScore: number;
  groupNumber: number | null;
  teachingAssistant?: {
    id: string;
    name: string | null;
    discordUsername: string;
    discordGlobalName: string | null;
  } | null;
}

export interface ExerciseScore {
  id: string;
  isSubmitted: boolean;
  isPassing: boolean;
  totalScore: number;
  maxTotalScore: number;
}

export interface AttendanceScore {
  totalScore: number;
  maxTotalScore: number;
}

export interface WeeklyScore {
  weekId: string;
  attended: boolean;
  groupDiscussionScores: GroupDiscussionScore | null;
  exerciseScores: ExerciseScore | null;
  attendanceScores: AttendanceScore | null;
  totalScore: number;
  maxTotalScore: number;
}

export interface UsersWeekScoreResponseDto extends WeeklyScore {
  userId: string;
  discordUsername: string;
  discordGlobalName: string | null;
  name: string | null;
  discordRoleAssigned: boolean;
  teachingAssistant: {
    id: string;
    name: string | null;
    discordUsername: string;
    discordGlobalName: string | null;
  } | null;
}

export interface ListScoresForCohortAndWeekResponseDto {
  scores: UsersWeekScoreResponseDto[];
}

export interface GetCohortScoresResponseDto {
  cohortId: string;
  cohortType: CohortType;
  seasonNumber: number;
  weeklyScores: WeeklyScore[];
  totalScore: number;
  maxTotalScore: number;
}

export interface GetUsersScoresResponseDto {
  cohorts: GetCohortScoresResponseDto[];
  totalScore: number;
  maxTotalScore: number;
}

export interface UpdateUserRequest {
  name?: string;
  description?: string;
  background?: string;
  githubProfileUrl?: string;
  portfolioUrl?: string;
  linkedinProfileUrl?: string;
  skills?: string[];
  firstHeardAboutBitcoinOn?: string;
  bitcoinBooksRead?: string[];
  whyBitcoin?: string;
  weeklyCohortCommitmentHours?: number;
  location?: string;
  referral?: string;
}

export interface UpdateUserRoleRequest {
  userId: string;
  role: UserRole;
}

export interface GetUserResponse {
  id: string;
  email: string;
  discordUsername: string;
  discordGlobalName: string | null;
  name: string | null;
  role: UserRole;
  description: string | null;
  background: string | null;
  githubProfileUrl: string | null;
  portfolioUrl: string | null;
  linkedinProfileUrl: string | null;
  skills: string[] | null;
  // ISO date (YYYY-MM-DD) of when first heard about Bitcoin
  firstHeardAboutBitcoinOn: string | null;
  bitcoinBooksRead: string[] | null;
  whyBitcoin: string | null;
  weeklyCohortCommitmentHours: number | null;
  location: string | null;
  referral: string | null;
}

export interface GetTeachingAssistantResponseDto {
  id: string;
  email: string;
  discordUserId: string;
  discordUserName: string;
  discordGlobalName: string | null;
  name: string | null;
}

export interface LeaderboardEntryDto {
  userId: string;
  name: string | null;
  discordUsername: string;
  discordGlobalName: string | null;
  groupDiscussionTotalScore: number;
  groupDiscussionMaxTotalScore: number;
  exerciseTotalScore: number;
  exerciseMaxTotalScore: number;
  totalScore: number;
  maxTotalScore: number;
  totalAttendance: number;
  maxAttendance: number;
}

export type GetCohortLeaderboardResponseDto = LeaderboardEntryDto[] | { leaderboard: LeaderboardEntryDto[] };

// GET /scores/cohort/:id/leaderboard/public — public, unauthenticated.
// Deliberately narrower than LeaderboardEntryDto: no real name, no userId, no
// attendance, no per-component breakdown. Keep it that way.
export interface PublicLeaderboardEntryDto {
  rank: number;
  discordUsername: string;
  totalScore: number;
  maxTotalScore: number;
}

// =========================
// Feedback
// =========================

export type ComponentRatingsDto = Partial<Record<CohortComponent, ComponentRating>>;

export interface CreateFeedbackRequestDto {
  componentRatings?: ComponentRatingsDto;
  expectations?: string;
  improvements?: string;
  opportunityInterests?: OpportunityInterest[];
  fellowshipInterests?: FellowshipInterest[];
  idealProject?: string;
  testimonial?: string;
}

export type UpdateFeedbackRequestDto = CreateFeedbackRequestDto;

export interface GetFeedbackResponseDto {
  id: string;
  userName: string | null;
  userEmail: string | null;
  componentRatings: ComponentRatingsDto | null;
  expectations: string | null;
  improvements: string | null;
  opportunityInterests: string[];
  fellowshipInterests: string[];
  idealProject: string | null;
  testimonial: string | null;
  cohortId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackResponseDto {
  id: string;
  message: string;
}

// =========================
// Certificates
// =========================

export type CertificateType = 'PARTICIPANT' | 'PERFORMER';

export interface GetCertificateResponseDto {
  id: string;
  userId: string;
  cohortId: string;
  name: string;
  certificateType: CertificateType;
  withExercises: boolean;
  rank: 1 | 2 | 3 | null;
  createdAt: string;
}

export interface CertificatePreviewResponseDto {
  userId: string;
  name: string;
  certificateType: CertificateType;
  rank: 1 | 2 | 3 | null;
  withExercises: boolean;
}
