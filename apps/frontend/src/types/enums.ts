export const CohortType = {
  MASTERING_BITCOIN: 'MASTERING_BITCOIN',
  LEARNING_BITCOIN_FROM_COMMAND_LINE: 'LEARNING_BITCOIN_FROM_COMMAND_LINE',
  PROGRAMMING_BITCOIN: 'PROGRAMMING_BITCOIN',
  BITCOIN_PROTOCOL_DEVELOPMENT: 'BITCOIN_PROTOCOL_DEVELOPMENT',
} as const;
export type CohortType = typeof CohortType[keyof typeof CohortType];

export const UserRole = {
  ADMIN: 'ADMIN',
  TEACHING_ASSISTANT: 'TEACHING_ASSISTANT',
  STUDENT: 'STUDENT',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];
