import apiService from '../services/apiService.ts';
import { createUseMutation, createUseQuery } from '../http';
import type {
  GetUsersScoresResponseDto,
  ListScoresForCohortAndWeekResponseDto,
  UpdateScoresRequestDto,
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
    },
  }
);

export const useAssignGroupsForCohortWeek = createUseMutation<
  void,
  { weekId: string }
>(
  ({ weekId }) => apiService.assignGroupsForCohortWeek(weekId),
);
