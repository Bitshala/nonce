import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/userHooks';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/enums';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, openLogin } = useAuth();
  // Signed out this just 401s, and the redirect below doesn't need it.
  const { data: user, isLoading } = useUser(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    // Signing in happens in the modal, so a guarded route drops you on the
    // public dashboard with it open rather than showing an interstitial page.
    // `replace` keeps the unreachable route out of history — pushing would let
    // Back land on it and re-run this guard.
    if (!isAuthenticated) {
      navigate('/myDashboard', { replace: true });
      openLogin();
      return;
    }

    // Signed in but with the wrong role is a dead end, so send them there.
    if (!isLoading && user && requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!allowedRoles.includes(user.role)) {
        navigate('/unauthorized', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRole, navigate, openLogin]);

  if (!isAuthenticated) {
    return null;
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If user doesn't have required role, don't render anything (will redirect)
  if (requiredRole && user) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(user.role)) {
      return null;
    }
  }

  // Render children if all checks pass
  return <>{children}</>;
};
