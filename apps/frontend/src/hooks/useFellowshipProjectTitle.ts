import type { GetFellowshipResponseDto } from '../types/fellowship';

// Fellowships often have no onboarding projectName — the project title lives
// in the application proposal. The fellowship payload already carries that
// title as proposalTitle, so there is no per-row proposal fetch.
export const useFellowshipProjectTitle = (
  fellowship: GetFellowshipResponseDto | null | undefined,
): string => fellowship?.projectName || fellowship?.proposalTitle || '';

export default useFellowshipProjectTitle;
