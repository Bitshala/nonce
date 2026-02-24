export interface BonusQuestion {
  question: string;
  image?: string;
}

export interface WeekContent {
  week: number;
  title: string;
  content: string;
  gdQuestions: string[];
  bonusQuestions?: (string | BonusQuestion)[];
  assignmentLinks?: Record<number, string>;
  classroomUrl?: string | null;
  classroomInviteLink?: string | null;
}
