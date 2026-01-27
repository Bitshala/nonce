/* ------------------------------
   Types
------------------------------ */

export interface StudentResult {
  userId: string;
  name: string;
  discordUsername: string;
  totalScore: number;
  totalAttendance: number;
  maxAttendance: number;
  exercisesCompleted: number;
}

export interface LeaderboardEntry {
  userId: string;
  name?: string;
  discordGlobalName?: string;
  discordUsername?: string;
  totalScore?: number;
  totalAttendance?: number;
  maxAttendance?: number;
  exerciseTotalScore?: number;
}

export interface LeaderboardData {
  leaderboard?: LeaderboardEntry[];
}

/* ------------------------------
   Error Handling
------------------------------ */

export const getErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return null;
};

/* ------------------------------
   Data Transformation
------------------------------ */

export const transformLeaderboardData = (
  leaderboardData: LeaderboardData | LeaderboardEntry[] | undefined
): StudentResult[] => {
  const leaderboard = Array.isArray(leaderboardData)
    ? leaderboardData
    : leaderboardData?.leaderboard;

  if (!leaderboard) return [];

  return leaderboard.map((entry) => ({
    userId: entry.userId,

    name:
      entry.name ??
      entry.discordGlobalName ??
      entry.discordUsername ??
      "Unknown",

    discordUsername: entry.discordUsername ?? "N/A",

    totalScore: entry.totalScore ?? 0,

    totalAttendance: entry.totalAttendance ?? 0,
    maxAttendance: entry.maxAttendance ?? 0,

    exercisesCompleted: Math.floor((entry.exerciseTotalScore ?? 0) / 60),
  }));
};

export const sortResults = (results: StudentResult[]): StudentResult[] => {
  return [...results].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }

    return a.discordUsername.localeCompare(b.discordUsername);
  });
};

export const formatCohortName = (cohortData: {
  type: string;
  season: number;
} | null): string => {
  if (!cohortData) return "";

  const typeName = cohortData.type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return `${typeName} - Season ${cohortData.season}`;
};

/* ------------------------------
   Styling Helpers
------------------------------ */

export const getScoreColorClass = (score: number): string => {
  if (score >= 90) return "text-emerald-400";
  if (score >= 80) return "text-amber-400";
  return "text-red-400";
};

export const getRankStyling = (rank: number): string => {
  switch (rank) {
    case 1:
      return "text-yellow-400 font-bold";
    case 2:
      return "text-gray-200 font-bold";
    case 3:
      return "text-amber-600 font-bold";
    default:
      return "text-zinc-400 font-semibold";
  }
};
