import type { GetUserResponse } from '../types/api';

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
    userData.location
  );
};
