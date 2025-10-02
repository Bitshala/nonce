const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
import apiClient from './api';

export const redirectToDiscordAuth = (role?: string) => {
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
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
export const handleDiscordCallback = async (
  location: { search: string; pathname?: string },
  navigate: (path: string, options?: { replace?: boolean }) => void
): Promise<boolean> => {


  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');

  console.log('session_id from URL:', sessionId);

  if (!sessionId) return false;

  try {
    // 1) Save token (PERSIST)
    localStorage.setItem('user_session_token', sessionId);

    // 2) Clean the URL (remove sensitive query params)
    const cleanPath = location.pathname || '/select';
    window.history.replaceState(null, '', cleanPath);

    // 3) Decide where to go
    const redirectPath = (await getRedirectPathForToken(sessionId)) ?? '/login';

    // 4) Navigate (replace to avoid back-button ping-pong)
    navigate(redirectPath, { replace: true });

    return true;
  } catch (e) {
    console.error('handleDiscordCallback error:', e);
    // On failure, keep the token (as requested) and send to a safe page
    navigate('/select', { replace: true });
    return false;
  }
};

export const getRedirectPathForToken = async (token: string): Promise<string | undefined> => {
  try {
    // You can rely on the interceptor to add the token from localStorage,
    // but passing it explicitly is also fine and robust.
    const res = await apiClient.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const user = res.data;
    console.log('User Data:', user);

    const role = (user?.role || '').toUpperCase();

    if (role === 'TEACHING_ASSISTANT' || role === 'ADMIN') {
      return '/select';
    }

    // Customize as needed:
    if (!role || role === 'PARTICIPANT' || role === 'USER') {
      return '/me';
    }

    // Fallback
    return '/me';
  } catch (err) {
    console.error('Error fetching user data:', err);
    // Don’t delete the token; just send to login/safe page
    return '/login';
  }
};

export const getApiBaseUrl = (): string => API_BASE_URL;
