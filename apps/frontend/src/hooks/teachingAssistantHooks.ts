import apiService from '../services/apiService.ts';
import { createUseQuery } from '../http';
import type { GetTeachingAssistantResponseDto } from '../types/api.ts';

// ===============
// Queries
// ===============

export const useTeachingAssistants = createUseQuery<
  GetTeachingAssistantResponseDto[],
  void
>(
  () => ['teaching-assistants'],
  () => apiService.listTeachingAssistants,
);

export const useTeachingAssistant = createUseQuery<
  GetTeachingAssistantResponseDto,
  string
>(
  (id) => ['teaching-assistant', id],
  (id) => () => apiService.getTeachingAssistant(id),
);
