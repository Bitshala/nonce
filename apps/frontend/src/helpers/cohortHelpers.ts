import { CohortType } from '../types/enums.ts';

export const cohortTypeToName = (type: CohortType) : string => {
  switch (type) {
    case CohortType.MASTERING_BITCOIN:
      return 'Mastering Bitcoin';
    case CohortType.LEARNING_BITCOIN_FROM_COMMAND_LINE:
      return 'Learning Bitcoin from the Command Line';
    case CohortType.PROGRAMMING_BITCOIN:
      return 'Programming Bitcoin';
    case CohortType.BITCOIN_PROTOCOL_DEVELOPMENT:
      return 'Bitcoin Protocol Development';
    case CohortType.MASTERING_LIGHTNING_NETWORK:
      return 'Mastering Lightning Network';
    default:
      return 'Unknown Cohort';
  }
}

export const formatCohortDate = (isoDate: string) : string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}