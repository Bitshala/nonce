// Scoring maxima moved to @nonce/shared — the frontend needs the same numbers to
// render scores and previously kept its own copy. Re-exported here so existing
// '@/common/constants' imports keep working.
export {
    GD_MAX,
    BONUS_MAX,
    EXERCISE_MAX,
    SCALING_FACTOR,
    GD_TRAITS_RAW_MAX,
    BONUS_RAW_MAX,
    GD_RAW_MAX,
} from '@nonce/shared/constants';

// Backend-only. Nothing app-specific belongs in the shared package.
export const DISCORD_GENERAL_INVITE_URL = 'https://discord.gg/benPDVcurg';
