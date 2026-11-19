import type { GetUserResponse } from '../types/api';
import { locationProblem } from '@nonce/shared';

export const isProfileComplete = (userData: GetUserResponse | undefined): boolean => {
  if (!userData) return false;

  // Check all required profile fields
  return !!(
    userData.email &&
    userData.name &&
    userData.description &&
    userData.background &&
    userData.githubProfileUrl &&
    userData.skills && userData.skills.length > 0 &&
    userData.firstHeardAboutBitcoinOn &&
    userData.bitcoinBooksRead && userData.bitcoinBooksRead.length > 0 &&
    userData.whyBitcoin &&
    userData.weeklyCohortCommitmentHours &&
    // Must name a city, not be blank or just "India" (#45); the profile form
    // shows which, so the join gate's redirect lands on a fixable field.
    locationProblem(userData.location) === null
  );
};
