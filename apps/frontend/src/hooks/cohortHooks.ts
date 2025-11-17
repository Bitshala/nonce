import apiService from '../services/apiService.ts';
import { createUseMutation, createUseQuery } from '../http';
import type {
  PaginatedDataDto,
  PaginatedQueryDto,
  GetCohortResponseDto,
  CreateCohortRequestDto,
  UpdateCohortRequestDto,
  UpdateCohortWeekRequestDto,
  JoinWaitlistRequestDto,
  UserCohortWaitlistResponseDto,
} from '../types/api.ts';

// ===============
// Queries
// ===============

export const useCohorts = createUseQuery<
  PaginatedDataDto<GetCohortResponseDto>,
  PaginatedQueryDto
>(
  (query) => ['cohorts', query],
  (query) => () => apiService.listCohorts(query),
);

export const useMyCohorts = createUseQuery<
  PaginatedDataDto<GetCohortResponseDto>,
  PaginatedQueryDto
>(
  (query) => ['cohorts', 'me', query],
  (query) => () => apiService.listMyCohorts(query),
);

export const useCohort = createUseQuery<GetCohortResponseDto, string>(
  (cohortId) => ['cohort', cohortId],
  (cohortId) => () => apiService.getCohort(cohortId),
);

export const useMyWaitlistStatus = createUseQuery<
  UserCohortWaitlistResponseDto,
  void
>(
  () => ['cohorts', 'waitlist', 'me'],
  () => apiService.getUserWaitlistStatus,
);

// ===============
// Mutations
// ===============

export const useCreateCohort = createUseMutation<void, CreateCohortRequestDto>(
  apiService.createCohort,
  {
    queryInvalidation: async () => {
      await useCohorts.invalidate();
      await useMyCohorts.invalidate();
    },
  },
);

export const useUpdateCohort = createUseMutation<
  void,
  { cohortId: string; body: UpdateCohortRequestDto }
>(
  ({ cohortId, body }) => apiService.updateCohort(cohortId, body),
  {
    queryInvalidation: async ({ variables: { cohortId } }) => {
      await useCohort.invalidate(cohortId);
      await useCohorts.invalidate();
      await useMyCohorts.invalidate();
    },
  },
);

export const useUpdateCohortWeek = createUseMutation<
  void,
  { cohortId: string; cohortWeekId: string; body: UpdateCohortWeekRequestDto }
>(
  ({ cohortWeekId, body }) => apiService.updateCohortWeek(cohortWeekId, body),
  {
    queryInvalidation: async ({ variables: { cohortId } }) => {
      await useCohort.invalidate(cohortId);
    },
  },
);

export const useJoinCohort = createUseMutation<void, { cohortId: string }>(
  ({ cohortId }) => apiService.joinCohort(cohortId),
);

export const useJoinCohortWaitlist = createUseMutation<
  void,
  JoinWaitlistRequestDto
>(apiService.joinCohortWaitlist, {
  queryInvalidation: async () => {
    await useMyWaitlistStatus.invalidate();
  },
});
