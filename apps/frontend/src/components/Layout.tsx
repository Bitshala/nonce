import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const hideNavbarRoutes = ['/login', '/unauthorized', '/*'];
  const showSidebar = isAuthenticated && !hideNavbarRoutes.includes(location.pathname);

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
};

export default Layout;
