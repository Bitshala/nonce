export type CohortStatus = 'Active' | 'Upcoming' | 'Completed';

export type ApiCohortWeek = {
  id: string;
  week: number;
};

export type ApiCohort = {
  id: string;
  type: string;
  season: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  weeks: ApiCohortWeek[];
};
