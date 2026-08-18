import {
  cohortInitials,
  lookupCohortFullName,
  lookupCohortShortName,
} from '@nonce/shared';
import apiService from '../services/apiService.ts';
import type { CohortWeekQuestion, GetCohortResponseDto } from '../types/api.ts';
import type { RenderQuestion, RenderWeek } from '../types/instructions.ts';

// The name tables live in @nonce/shared so the backend's mail templates and API
// responses render identical strings. These wrappers keep the frontend's lenient
// behaviour: a deployed bundle can be older than the API, so an unrecognised
// cohort type degrades to a placeholder rather than throwing.
//
// Note this previously said 'Mastering Lightning Network' while the backend said
// 'Mastering the Lightning Network'. The backend spelling is now authoritative.
export const cohortTypeToName = (type: string): string =>
  lookupCohortFullName(type) ?? 'Unknown Cohort';

export const cohortTypeToShortName = (type: string): string =>
  lookupCohortShortName(type) ?? cohortInitials(type);

export const formatCohortDate = (isoDate: string) : string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const toRenderQuestion = (
  cohortId: string,
  question: CohortWeekQuestion,
): RenderQuestion => ({
  text: question.text,
  attachments: question.attachments.map((filename) => ({
    filename,
    url: apiService.getAttachmentUrl(cohortId, filename),
  })),
});

// Maps an API cohort into the render model the instruction sheet consumes.
// Only GROUP_DISCUSSION weeks are surfaced (orientation/graduation are excluded),
// and question attachment filenames are resolved to authenticated stream URLs.
export const toRenderWeeks = (cohort: GetCohortResponseDto): RenderWeek[] =>
  cohort.weeks
    .filter((week) => week.type === 'GROUP_DISCUSSION')
    .slice()
    .sort((a, b) => a.week - b.week)
    .map((week) => ({
      id: week.id,
      week: week.week,
      title: week.title,
      readingMaterial: week.readingMaterial,
      activity: week.activity,
      questions: week.questions.map((q) => toRenderQuestion(cohort.id, q)),
      bonusQuestions: week.bonusQuestions.map((q) => toRenderQuestion(cohort.id, q)),
      exercise: week.exercise,
      classroomAssignmentUrl: week.classroomAssignmentUrl,
      classroomInviteLink: week.classroomInviteLink,
    }));