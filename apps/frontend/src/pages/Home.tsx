import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useUser } from '../hooks/userHooks';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/enums.ts';

function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const { login, token: storedToken } = useAuth();
  const { data: user, isLoading, isPending } = useUser(undefined, { enabled: !!storedToken });

  // Read once and memoize so the effect only cares about the sessionId value
  const sessionId = useMemo(() => searchParams.get('session_id'), [searchParams]);

  // Prevent double navigations if effects re-run
  const hasRedirected = useRef(false);

  // If session_id exists, perform login and then strip it from the URL
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    (async () => {
      try {
        login(sessionId); // if login is sync, this still works
      } finally {
        if (!cancelled) {
          // Replace current entry to avoid back-button re-login
          navigate(
            { pathname: location.pathname },
            { replace: true }
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, login, navigate, searchParams, location.pathname]);

  // Once user finished loading, route by auth + role
  useEffect(() => {
    console.log(isLoading, isPending, sessionId, storedToken, user, hasRedirected.current);
    if (hasRedirected.current) return;
    if (isLoading) return; // wait until we actually know user/null

    if ((!storedToken && !sessionId) || (!user && !isPending)) {
      navigate('/login', { replace: true });
      hasRedirected.current = true;
      return;
    }

    if (!user) return; // still loading or pending

    const role = user.role;

    if ([UserRole.TEACHING_ASSISTANT, UserRole.ADMIN].includes(role)) {
      navigate('/select', { replace: true });
    } else if (role === UserRole.STUDENT) {
      navigate('/myDashboard', { replace: true });
    } else {
      // Fallback if role is unknown
      navigate('/login', { replace: true });
    }

    hasRedirected.current = true;
  }, [isLoading, storedToken, user, navigate]);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center font-mono">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        <p className="text-zinc-400">Processing authentication...</p>
      </div>
    </div>
  );
}

export default Home;