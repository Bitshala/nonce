const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const AUTH_TOKEN_TA = import.meta.env.VITE_AUTH_TOKEN_TA;
const AUTH_TOKEN_PARTICIPANT = import.meta.env.VITE_AUTH_TOKEN_PARTICIPANT;
const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const DISCORD_TA_REDIRECT_URI = import.meta.env.VITE_DISCORD_TA_REDIRECT_URI;

console.log('Discord TA Redirect URI:', DISCORD_TA_REDIRECT_URI);
const DISCORD_PARTICIPANT_REDIRECT_URI = import.meta.env.VITE_DISCORD_PARTICIPANT_REDIRECT_URI;

export const isTaAuthenticated = (token?: string): boolean => {
  const isValidToken = token === AUTH_TOKEN_TA 
  return isValidToken;
};

export const isParticipantAuthenticated = (token?: string, role?: string): boolean => {
  const isValidToken = token === AUTH_TOKEN_PARTICIPANT;
  console.log('Checking authentication:', { 
    token, 
    AUTH_TOKEN_PARTICIPANT, 
    role, 
    isValid: isValidToken,
    tokenLength: token?.length,
    expectedLength: AUTH_TOKEN_PARTICIPANT?.length,
    tokenType: typeof token,
    expectedType: typeof AUTH_TOKEN_PARTICIPANT
  });
  return isValidToken;
};

export const getTokenFromLocation = (location: {
  search: string;
  state?: { token?: string };
}): string | undefined => {
  const queryToken = new URLSearchParams(location.search).get('token');
  const stateToken = location.state?.token;
  const storedToken = localStorage.getItem('bitshala_token');

  console.log('Getting token from location:', { 
    search: location.search, 
    queryToken, 
    stateToken, 
    storedToken,
    finalToken: stateToken || queryToken || storedToken || undefined
  });

  return stateToken || queryToken || storedToken || undefined;
};

export const storeToken = (token: string): void => {
  localStorage.setItem('bitshala_token', token);
};

export const clearToken = (): void => {
  localStorage.removeItem('bitshala_token');
};

export const getStoredToken = (): string | null => {
  return localStorage.getItem('bitshala_token');
};

export const redirectToDiscordAuth = (role: string): void => {
  const SCOPES = encodeURIComponent('identify guilds email guilds.join');
  let encodedRedirectUri;

  if ( role === 'ta' ) {
    encodedRedirectUri = encodeURIComponent(DISCORD_TA_REDIRECT_URI);
  }
  else if ( role === 'participant' ) {
    encodedRedirectUri = encodeURIComponent(DISCORD_PARTICIPANT_REDIRECT_URI);
  }

  const discordOAuthUrl =
    `https://discord.com/oauth2/authorize?` +
    `client_id=${DISCORD_CLIENT_ID}&` +
    `redirect_uri=${encodedRedirectUri}&` +
    `response_type=code&` +
    `scope=${SCOPES}`;

  window.location.href = discordOAuthUrl;
};



export const handleDiscordCallback = (
  location: { search: string },
  navigate: (path: string, options?: { state?: { token?: string; role?: string; email?: string; username?: string } }) => void
): boolean => {
  const params = new URLSearchParams(location.search);
  const authSource = params.get('auth');
  const token = params.get('token');
  const role = params.get('role');
  const email = params.get('email');
  const username = params.get('username');

  const expectedToken = role === 'participant' ? AUTH_TOKEN_PARTICIPANT : AUTH_TOKEN_TA;
  
  if (authSource === 'discord' && token === expectedToken) {
    // Redirect TAs to select page, participants to instructions
    const redirectPath = getRedirectPathForToken(token!);
    navigate(redirectPath, { 
      state: { 
        token: token ?? undefined, 
        role: role ?? undefined,
        email: email ?? undefined,
        username: username ?? undefined
      } 
    });
    return true;
  }

  return false;
};

export const loginWithEmail = async (
  email: string
): Promise<{ success: boolean; error?: string; token?: string }> => {
  if (!email) {
    return { success: false, error: 'Please enter your email address' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gmail: email }),
    });

    if (!response.ok) {
      throw new Error('Access denied');
    }

    const data = await response.json();
    const token = data.token;

    if (token === AUTH_TOKEN_TA) {
      return { success: true, token };
    } else {
      return { success: false, error: 'Invalid token returned from server.' };
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Login failed';
    return { success: false, error };
  }
};


export const getAuthToken = (role?: string): string => {
  return role === 'participant' ? AUTH_TOKEN_PARTICIPANT : AUTH_TOKEN_TA;
};

export const getApiBaseUrl = (): string => {
  return API_BASE_URL;
};

export const getRedirectPathForToken = (token: string): string => {
  return token === AUTH_TOKEN_TA ? '/select' : '/instructions';
};
