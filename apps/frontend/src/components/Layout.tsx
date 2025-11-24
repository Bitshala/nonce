import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import FloatingNavbar from './FloatingNavbar';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Don't show navbar on login page, unauthorized page, or error pages
  const hideNavbarRoutes = ['/login', '/unauthorized', '/*'];
  const shouldShowNavbar = isAuthenticated && !hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      {children}
      {shouldShowNavbar && <FloatingNavbar />}
    </>
  );
};

export default Layout;
