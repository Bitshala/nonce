import apiService from '../services/apiService.ts';
import { createUseMutation, createUseQuery } from '../http';
import type {
  GetUsersScoresResponseDto,
  ListScoresForCohortAndWeekResponseDto,
  UpdateScoresRequestDto,
  GetCohortLeaderboardResponseDto,
} from '../types/api.ts';

// ===============
// Queries
// ===============

export const useScoresForCohortAndWeek = createUseQuery<
  ListScoresForCohortAndWeekResponseDto,
  { cohortId: string; weekId: string }
>(
  ({ cohortId, weekId }) => ['scores', 'cohort', cohortId, 'week', weekId],
  ({ cohortId, weekId }) => () =>
    apiService.listScoresForCohortAndWeek(cohortId, weekId)
);

export const useMyScores = createUseQuery<GetUsersScoresResponseDto, void>(
  () => ['scores', 'me'],
  () => apiService.getMyScores
);

export const useUserScores = createUseQuery<
  GetUsersScoresResponseDto,
  string
>(
  (userId) => ['scores', 'user', userId],
  (userId) => () => apiService.getUserScores(userId)
);

export const useCohortLeaderboard = createUseQuery<
  GetCohortLeaderboardResponseDto,
  { cohortId: string }
>(
  ({ cohortId }) => ['scores', 'cohort', cohortId, 'leaderboard'],
  ({ cohortId }) => () => apiService.getCohortLeaderboard(cohortId)
);

// ===============
// Mutations
// ===============

export const useUpdateScoresForUserCohortAndWeek = createUseMutation<
  void,
  { userId: string; cohortId: string; weekId: string; body: UpdateScoresRequestDto }
>(
  ({ userId, cohortId, weekId, body }) =>
    apiService.updateScoresForUserCohortAndWeek(userId, cohortId, weekId, body),
  {
    queryInvalidation: async ({variables: {userId, cohortId, weekId}}) => {
      await useScoresForCohortAndWeek.invalidate({cohortId, weekId});
      await useUserScores.invalidate(userId);
      await useMyScores.invalidate();
      await useCohortLeaderboard.invalidate({cohortId});
    },
  }
);

export const useAssignGroupsForCohortWeek = createUseMutation<
  void,
  { weekId: string; cohortId: string; participantsPerWeek: number; groupsAvailable: number }
>(
  ({ weekId, participantsPerWeek, groupsAvailable }) => apiService.assignGroupsForCohortWeek(weekId, { participantsPerWeek, groupsAvailable }),
  {
    queryInvalidation: async ({variables: {weekId, cohortId}}) => {
      if (cohortId) {
        await useScoresForCohortAndWeek.invalidate({cohortId, weekId});
      }
    },
  }
);

export const useAssignSelfToGroup = createUseMutation<
  void,
  { weekId: string; cohortId: string; groupNumber: number }
>(
  ({ weekId, groupNumber }) => apiService.assignSelfToGroup(weekId, groupNumber),
  {
    queryInvalidation: async ({variables: {weekId, cohortId}}) => {
      if (cohortId) {
        await useScoresForCohortAndWeek.invalidate({cohortId, weekId});
      }
      await useMyScores.invalidate();
    },
  }
);
