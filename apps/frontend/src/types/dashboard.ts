export interface CohortCardProps {
  cohortId: string;
  cohortType: string;
  imageUrl: string;
  isLoading?: boolean;
  isEnrolled?: boolean;
  registrationOpen?: boolean;
  onClick?: () => void;
}

export interface CohortFilterOptions {
  showEndedCohorts?: boolean;
}
