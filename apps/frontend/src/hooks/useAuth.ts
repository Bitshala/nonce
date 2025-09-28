import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AUTH_TOKEN_KEY,
  clearAuthTokenFromStorage,
  getAuthTokenFromStorage,
  saveAuthTokenToStorage,
} from '../services/authService';

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  login: (newToken: string) => void;
  logout: () => void;
}

export const useAuth = (): AuthState => {
  const navigate = useNavigate();

  // Initialize from storage once (SSR-safe)
  const [token, setToken] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined' ? getAuthTokenFromStorage() : null;
    } catch {
      return null;
    }
  });

  // Keep isAuthenticated derived & memoized
  const isAuthenticated = useMemo(() => !!token, [token]);

  const login = useCallback((newToken: string) => {
    try {
      saveAuthTokenToStorage(newToken);
    } finally {
      setToken(newToken);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      clearAuthTokenFromStorage();
    } finally {
      setToken(null);
      navigate('/login');
    }
  }, [navigate]);

  // Cross-tab sync: respond to storage events (logout/login elsewhere)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_TOKEN_KEY) {
        setToken(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { isAuthenticated, token, login, logout };
};
