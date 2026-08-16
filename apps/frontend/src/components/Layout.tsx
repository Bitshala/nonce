import { Suspense, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import Sidebar from './Sidebar';
import LoginModal from './LoginModal';

interface LayoutProps {
  children: ReactNode;
}

// Shown while a lazily-loaded route chunk is being fetched
const PageFallback = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', bgcolor: '#000' }}>
    <CircularProgress sx={{ color: '#f97316' }} />
  </Box>
);

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  // Signed-out visitors get the same shell as everyone else — the sidebar is
  // part of the product, not a reward for logging in. Only the routes that
  // render their own full-screen page opt out.
  const bareRoutes = ['/unauthorized'];

  if (bareRoutes.includes(location.pathname)) {
    return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <Box component="main" sx={{ flex: 1, overflow: 'auto' }}>
        <Suspense fallback={<PageFallback />}>{children}</Suspense>
      </Box>
      {/* Rendered here so it overlays whichever page you were on. */}
      <LoginModal />
    </Box>
  );
};

export default Layout;
