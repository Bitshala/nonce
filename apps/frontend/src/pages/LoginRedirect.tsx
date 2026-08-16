import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * `/login` is no longer a page — signing in happens in a modal over whatever
 * you were looking at. This keeps the old URL working for bookmarks and stale
 * links by dropping you on the dashboard with that modal already open.
 */
const LoginRedirect = () => {
  const navigate = useNavigate();
  const { isAuthenticated, openLogin } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }
    navigate('/myDashboard', { replace: true });
    openLogin();
  }, [isAuthenticated, navigate, openLogin]);

  return null;
};

export default LoginRedirect;
