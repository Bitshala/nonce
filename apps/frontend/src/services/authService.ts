export const AUTH_TOKEN_KEY = 'auth_session_token'

export const getAuthTokenFromStorage = (): string | null => {
      return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const saveAuthTokenToStorage = (token: string): void => {
     localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export const clearAuthTokenFromStorage = (): void => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
}