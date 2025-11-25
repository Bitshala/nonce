import apiService from '../services/apiService.ts';
import { createUseMutation } from '../http';

// ===============
// Mutations
// ===============

export const useSubmitFeedback = createUseMutation<
  void,
  { cohortId: string; feedback: string }
>(
  ({ cohortId, feedback }) => apiService.submitFeedback(cohortId, { feedbackText: feedback }),
);
