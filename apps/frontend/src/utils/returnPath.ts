const KEY = 'post_login_return_path';

/**
 * Where to send someone after signing in.
 *
 * Discord's callback always lands on `/` with a `session_id`, so the page they
 * started from is lost by the time we're back. The sign-in modal stashes it
 * here first and Home reads it once the session is established.
 */

export const rememberReturnPath = (path: string): void => {
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // Private mode or storage disabled — fall back to the default landing.
  }
};

/** Reads and clears the stored path. Returns null if there isn't a usable one. */
export const consumeReturnPath = (): string | null => {
  let path: string | null = null;
  try {
    path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    return null;
  }

  if (!path) return null;

  // Only same-origin absolute paths. `//evil.com` is protocol-relative and
  // would navigate off-site, so reject anything that isn't a single leading
  // slash. Returning to `/` would re-run the callback logic pointlessly.
  if (!path.startsWith('/') || path.startsWith('//') || path === '/') return null;

  return path;
};
