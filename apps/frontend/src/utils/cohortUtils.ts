export const getCohortImage = (cohortType: string): string => {
  const imageMap: Record<string, string> = {
    'MASTERING_BITCOIN': 'https://bitshala.org/cohort/mb.webp',
    'LEARNING_BITCOIN_FROM_COMMAND_LINE': 'https://bitshala.org/cohort/lbtcl.webp',
    'BITCOIN_PROTOCOL_DEVELOPMENT': 'https://bitshala.org/cohort/bpd.webp',
    'PROGRAMMING_BITCOIN': 'https://bitshala.org/cohort/pb.webp',
  };
  return imageMap[cohortType] || 'https://bitshala.org/cohort/mb.webp';
};

export const isRegistrationOpen = (registrationDeadline: string): boolean => {
  const now = new Date();
  const deadline = new Date(registrationDeadline);
  return now <= deadline;
};

export const isCohortActive = (endDate: string): boolean => {
  const now = new Date();
  const cohortEndDate = new Date(endDate);
  return now <= cohortEndDate;
};

export const formatCohortType = (cohortType: string): string => {
  return cohortType.replace(/_/g, ' ');
};
