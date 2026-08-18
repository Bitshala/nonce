import {
  AUTH_TOKEN_KEY,
  clearAuthTokenFromStorage,
  getAuthTokenFromStorage,
  saveAuthTokenToStorage,
} from './authService.ts';

/**
 * Single source of truth for the session token.
 *
 * `useAuth` used to hold the token in its own `useState`, so every call site got
 * an independent copy — signing in from one component left the sidebar, layout
 * and route guards still believing they were logged out until they remounted.
 * That was tolerable while every page required auth; it is not once anonymous
 * visitors and signed-in users share the same screens.
 *
 * This lives outside React (rather than in a context) because `useAuth` calls
 * `useNavigate`, so a provider would have to sit inside `RouterProvider` — and
 * react-router v7's `RouterProvider` takes no children.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

const readToken = (): string | null => {
  try {
    return typeof window !== 'undefined' ? getAuthTokenFromStorage() : null;
  } catch {
    return null;
  }
};

// Cached so the snapshot getters are referentially stable, as
// useSyncExternalStore requires.
let token: string | null = readToken();

// Whether the sign-in modal is showing. Lives here rather than in a component
// because it's opened from all over — the sidebar, the dashboard's Join
// button, the /login route — and none of those share a parent.
let loginModalOpen = false;

const emit = () => {
  listeners.forEach((listener) => listener());
};

const setToken = (next: string | null) => {
  if (token === next) return;
  token = next;
  emit();
};

// Cross-tab sync: another tab logging in or out updates this one.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === AUTH_TOKEN_KEY) {
      setToken(event.newValue);
    }
  });
}

export const authStore = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): string | null {
    return token;
  },

  getLoginModalSnapshot(): boolean {
    return loginModalOpen;
  },

  openLoginModal(): void {
    if (loginModalOpen) return;
    loginModalOpen = true;
    emit();
  },

  closeLoginModal(): void {
    if (!loginModalOpen) return;
    loginModalOpen = false;
    emit();
  },

  login(newToken: string): void {
    try {
      saveAuthTokenToStorage(newToken);
    } finally {
      loginModalOpen = false;
      setToken(newToken);
    }
  },

  clear(): void {
    try {
      clearAuthTokenFromStorage();
    } finally {
      setToken(null);
    }
  },
};
