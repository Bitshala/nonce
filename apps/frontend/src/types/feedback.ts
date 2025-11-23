export type NotificationType = 'success' | 'error';

export interface NotificationState {
  show: boolean;
  message: string;
  type: NotificationType;
}

export interface FeedbackFormData {
  cohortId: string;
  feedback: string;
}

export interface SubmitFeedbackRequest {
  cohortId: string;
  feedback: string;
  userId?: string;
}
