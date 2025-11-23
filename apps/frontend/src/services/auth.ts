const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


export const redirectToDiscordAuth = (role?: string) => {
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || 'https://api.bitshala.org';
  const authPath = role ? `/auth/discord/${role}` : '/auth/discord';
  window.location.href = `${backendUrl}${authPath}`;
};

/**
 * Call this once on the /select (or your designated callback page) mount.
 * It will:
 *  1) Read ?session_id=... from URL
 *  2) Save it to localStorage as user_session_token
 *  3) Clean the URL (remove query params)
 *  4) Route based on /users/me role
 */


export const getApiBaseUrl = (): string => API_BASE_URL;
