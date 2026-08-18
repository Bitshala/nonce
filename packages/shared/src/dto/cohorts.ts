import { CohortType, CohortWeekType } from '../enums';

// --- Instruction-sheet content, served inside GET /cohorts/:id ---

export interface CohortWeekQuestion {
  text: string;
  attachments: string[];
}

export interface ReadingMaterialLink {
  label: string;
  url: string;
}

/** Node-setup exercise for a single week (drives the "Exercises" tab), or null. */
export interface CohortWeekExercise {
  title: string;
  concepts: string;
  problem: string;
  expectedOutput: string[];
}

/** Quick links, already filtered by viewer role server-side. `minRole` is dropped. */
export interface CohortLink {
  label: string;
  url: string;
}

export interface GetCohortWeekResponse {
  id: string;
  week: number;
  type: CohortWeekType;
  hasExercise: boolean;
  title: string | null;
  questions: CohortWeekQuestion[];
  /** Empty for STUDENTs and anonymous viewers — role-filtered server-side. */
  bonusQuestions: CohortWeekQuestion[];
  readingMaterial: ReadingMaterialLink[];
  activity: string | null;
  exercise: CohortWeekExercise | null;
  /** null for anonymous viewers: invite links are join tokens, not content. */
  classroomInviteLink: string | null;
  classroomAssignmentUrl: string | null;
  scheduledDate: string;
}

export interface GetCohortResponse {
  id: string;
  type: CohortType;
  displayName: string;
  season: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  /** Graded GitHub-Classroom flag — NOT the Exercises tab, which is per-week. */
  hasExercises: boolean;
  classroomId: string | null;
  links: CohortLink[];
  weeks: GetCohortWeekResponse[];
}

/** The PII-free shape served to unauthenticated callers. */
export interface PublicCohortResponse {
  id: string;
  type: CohortType;
  season: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
}

/** GET /cohorts/available — the newest joinable cohort per type, or null. */
export type ListAvailableCohortsResponse = {
  [K in CohortType]: PublicCohortResponse | null;
};

export interface UserCohortWaitlistResponse {
  cohortWaitlist: CohortType[];
}

// --- Requests ---

export interface UpdateCohortRequest {
  startDate?: string;
  registrationDeadline?: string;
}

export interface CreateCohortRequest {
  type: CohortType;
  startDate: string;
  registrationDeadline: string;
}

/**
 * Instruction-sheet content is no longer edited through the API — it comes from
 * the course config files and is applied with POST /cohorts/:id/sync-from-config.
 * PATCH /cohorts/weeks/:id carries only operational (non-config) fields.
 */
export interface UpdateCohortWeekRequest {
  classroomAssignmentId?: string;
  scheduledDate?: string;
}

export interface JoinWaitlistRequest {
  type: CohortType;
}
