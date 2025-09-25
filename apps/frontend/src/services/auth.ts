const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const redirectToDiscordAuth = (role?: string) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  const authPath = role ? `/auth/discord/${role}` : '/auth/discord';
  window.location.href = `${backendUrl}${authPath}`;
};


export const handleDiscordCallback = async (
  location: { search: string },
  navigate: (path: string, options?: { state?: { token?: string; role?: string; email?: string; username?: string } }) => void
): Promise<boolean> => {
  const params = new URLSearchParams(location.search);
  const BearerToken = params.get('session_id');


  if (BearerToken ) {
    // Redirect TAs to select page, participants to instructions
    localStorage.setItem('user_session_token', BearerToken);
    const redirectPath = await getRedirectPathForToken(BearerToken!) ?? '/login';
    navigate(redirectPath);
    return true;
  }

  return false;
};

export const getRedirectPathForToken = async (token: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch user data:', response.status, response.statusText);
      return '/login';
    }

    const userData = await response.json();
    console.log('User Data:', userData);
    console.log('User Data:', userData.role);
    if(userData.role === 'TEACHING_ASSISTANT') {
      return '/admin';
    } else if (userData.role === '') {
      return '/admin';
    }

  } catch (error) {
    console.error('Error fetching user data:', error);
    return '/login';
  }
};


export const getApiBaseUrl = (): string => {
  return API_BASE_URL;
};