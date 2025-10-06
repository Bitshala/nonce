import { CohortType, UserRole } from './enums.ts';

export interface PaginatedQueryDto {
  pageSize: number;
  page: number;
}

export interface PaginatedDataDto<TData> {
  totalRecords: number;
  records: TData[];
}

export interface UpdateCohortRequestDto {
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
}

export interface CreateCohortRequestDto {
  type: CohortType;
  season: number;
  weeks: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
}

export interface UpdateCohortWeekRequestDto {
  questions: string[] | undefined;
  bonusQuestion: string[] | undefined;
  classroomUrl: string | undefined;
  classroomInviteLink: string | undefined;
}

export interface JoinWaitlistRequestDto {
  type: CohortType;
}

export interface GetCohortWeekResponseDto {
  id: string;
  week: number;
  questions: string[];
  bonusQuestion: string[];
  classroomUrl: string | null;
  classroomInviteLink: string | null;
}

export interface GetCohortResponseDto {
  id: string;
  type: CohortType;
  season: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  weeks: GetCohortWeekResponseDto[];
}

export interface UserCohortWaitlistResponseDto {
  cohortWaitlist: CohortType[];
}

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
  hasGoodDocumentation?: boolean;
  hasGoodStructure?: boolean;
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
}

export interface ExerciseScore {
  id: string;
  isSubmitted: boolean;
  isPassing: boolean;
  hasGoodDocumentation: boolean;
  hasGoodStructure: boolean;
  totalScore: number;
  maxTotalScore: number;
}

export interface WeeklyScore {
  weekId: string;
  groupDiscussionScores: GroupDiscussionScore;
  exerciseScores: ExerciseScore;
  totalScore: number;
  maxTotalScore: number;
}

export interface UsersWeekScoreResponseDto extends WeeklyScore {
  // User details
  userId: string;
  discordUsername: string;
  discordGlobalName: string | null;
  name: string | null;
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
  skills?: string[];
  firstHeardAboutBitcoinOn?: string;
  bitcoinBooksRead?: string[];
  whyBitcoin?: string;
  weeklyCohortCommitmentHours?: number;
  location?: string;
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
  skills: string[] | null;
  // ISO date (YYYY-MM-DD) of when first heard about Bitcoin
  firstHeardAboutBitcoinOn: string | null;
  bitcoinBooksRead: string[] | null;
  whyBitcoin: string | null;
  weeklyCohortCommitmentHours: number | null;
  location: string | null;
}
