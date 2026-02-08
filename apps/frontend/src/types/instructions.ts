export interface WeekContent {
  week: number;
  title: string;
  content: string;
  gdQuestions: string[];
  bonusQuestions?: string[];
  assignmentLinks?: Record<number, string>;
}
