import apiService from '../services/apiService.ts';
import { createUseMutation, createUseQuery } from '../http';
import { GetUserResponse, UpdateUserRequest, UpdateUserRoleRequest } from '../types/api.ts';

// ===============
// Queries
// ===============

export const useUser = createUseQuery<GetUserResponse, void>(
  () => ['user'],
  () => apiService.getUser
);

// ===============
// Mutations
// ===============

export const useUpdateUser = createUseMutation<
  GetUserResponse,
  UpdateUserRequest
>(apiService.updateUser, {
  queryInvalidation: async () => {
    await useUser.invalidate();
  },
});

export const useUpdateUserRole = createUseMutation<void, UpdateUserRoleRequest>(
  apiService.updateUserRole,
);