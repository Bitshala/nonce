import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/userHooks';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/enums';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: user, isLoading } = useUser();

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // If authenticated but user data is loaded and doesn't have required role
    if (!isLoading && user && requiredRole && user.role !== requiredRole) {
      navigate('/unauthorized');
    }
  }, [isAuthenticated, isLoading, user, requiredRole, navigate]);

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

  // If not authenticated, don't render anything (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // If user doesn't have required role, don't render anything (will redirect)
  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  // Render children if all checks pass
  return <>{children}</>;
};
