import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { authStore } from '../services/authStore.ts';

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  login: (newToken: string) => void;
  logout: () => void;
  isLoginModalOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
}

export const useAuth = (): AuthState => {
  const navigate = useNavigate();

  // Shared module-level store, so every call site sees the same token and
  // re-renders together on login/logout. See services/authStore.ts.
  const token = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getSnapshot,
  );

  const isLoginModalOpen = useSyncExternalStore(
    authStore.subscribe,
    authStore.getLoginModalSnapshot,
    authStore.getLoginModalSnapshot,
  );

  const isAuthenticated = useMemo(() => !!token, [token]);

  const login = useCallback((newToken: string) => {
    authStore.login(newToken);
  }, []);

  const logout = useCallback(() => {
    authStore.clear();
    // Land on the public dashboard rather than a login screen — signing out
    // drops you to the preview, not out of the app. `replace` because the page
    // being left is now unreachable; you can't go back to being signed in.
    navigate('/myDashboard', { replace: true });
  }, [navigate]);

  const openLogin = useCallback(() => authStore.openLoginModal(), []);
  const closeLogin = useCallback(() => authStore.closeLoginModal(), []);

  return { isAuthenticated, token, login, logout, isLoginModalOpen, openLogin, closeLogin };
};
