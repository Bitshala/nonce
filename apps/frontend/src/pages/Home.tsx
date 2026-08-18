import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useUser } from '../hooks/userHooks';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/enums.ts';
import { consumeReturnPath } from '../utils/returnPath.ts';

/**
 * `/` serves double duty: it is the Discord OAuth callback target (the backend
 * redirects here with `?session_id=`) and the entry point for everyone else.
 *
 * Order matters — the callback is handled first, so a returning OAuth redirect
 * never flashes the wrong screen. Signed-out visitors land on the same
 * dashboard a student sees; the actions there route them to login.
 */
function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const { login, token } = useAuth();
  const { data: user, isLoading } = useUser(undefined, { enabled: !!token });

  // Read once and memoize so the effect only cares about the sessionId value
  const sessionId = useMemo(() => searchParams.get('session_id'), [searchParams]);

  // Prevent double navigations if effects re-run
  const hasRedirected = useRef(false);

  // If session_id exists, perform login and then strip it from the URL
  useEffect(() => {
    if (!sessionId) return;

    login(sessionId);
    // Replace current entry to avoid back-button re-login
    navigate({ pathname: location.pathname }, { replace: true });
  }, [sessionId, login, navigate, location.pathname]);

  useEffect(() => {
    if (hasRedirected.current) return;

    // Signed out (and no callback in flight): show the same dashboard a student
    // sees, with nothing enrolled.
    if (!token && !sessionId) {
      hasRedirected.current = true;
      navigate('/myDashboard', { replace: true });
      return;
    }

    if (!token) return; // callback still settling
    if (isLoading || !user) return;

    hasRedirected.current = true;

    // If they were sent here by the sign-in modal, put them back where they
    // were rather than on the default landing page.
    const returnPath = consumeReturnPath();
    if (returnPath) {
      navigate(returnPath, { replace: true });
      return;
    }

    const role = user.role;
    if ([UserRole.TEACHING_ASSISTANT, UserRole.ADMIN].includes(role)) {
      navigate('/select', { replace: true });
    } else {
      navigate('/myDashboard', { replace: true });
    }
  }, [token, sessionId, isLoading, user, navigate]);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center font-mono">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        <p className="text-zinc-400">Loading...</p>
      </div>
    </div>
  );
}

export default Home;
