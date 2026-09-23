// Sort types
export type SortType = 'default' | 'total_score_asc' | 'total_score_desc' | 'exercise_score_asc' | 'exercise_score_desc';

// Score breakdowns
export interface GdScore {
  fa: number;
  fb: number;
  fc: number;
  fd: number;
}

export interface BonusScore {
  attempt: number;
  good: number;
  followUp: number;
}

export interface ExerciseScore {
  Submitted: boolean;
  privateTest: boolean;
}

// Table/UI Types
export interface TableRowData {
  userId: number;
  id: number;
  name: string;
  discordGlobalName: string;
  discordUsername: string;
  email: string;
  location: string;
  group: string;
  ta: string;
  attendance: boolean;
  gdScore: GdScore | null;
  bonusScore: BonusScore | null;
  exerciseScore: ExerciseScore | null;
  week?: number;
  total: number;
  discordRoleAssigned: boolean;
}

// Single source of truth for the label text shared by the grid header and
// the CSV export, so wording can't drift apart (see PR #38). The grid still
// hand-writes its header cells (per-column sort handlers, sticky/responsive
// styling), so this shares label text only, not the column set itself.
export type StudentTextField = 'discordGlobalName' | 'discordUsername' | 'location' | 'email' | 'group' | 'ta';

export const STUDENT_COLUMNS: { key: StudentTextField; label: string }[] = [
  { key: 'discordGlobalName', label: 'Name' },
  { key: 'discordUsername', label: 'Discord Name' },
  { key: 'location', label: 'Location' },
  { key: 'email', label: 'Email' },
  { key: 'group', label: 'Group' },
  { key: 'ta', label: 'TA' },
];

export const STUDENT_COLUMN_LABEL = Object.fromEntries(
  STUDENT_COLUMNS.map((c) => [c.key, c.label])
) as Record<StudentTextField, string>;

// Weekly data for student detail view
export interface WeeklyData {
  week: number;
  attendance: boolean;
  gdScore: GdScore;
  bonusScore: BonusScore;
  exerciseScore: ExerciseScore;
  total: number;
  totalScore: number;
  maxTotalScore: number;
  group: string;
  ta: string;
}

export interface StudentData {
  name: string;
  email: string;
  group: string;
  ta: string;
  weeklyData: WeeklyData[];
}

export interface StudentBackground {
  describe_yourself?: string;
  background?: string;
  skills?: string;
  location?: string;
  why?: string;
  year?: string;
  book?: string;
}


// Result page types
export interface StudentResult {
  name: string;
  email: string;
  total_score: number;
  exercise_total_score?: number;
}
