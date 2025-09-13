import { type JSX, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import {
  getTokenFromLocation,
  isParticipantAuthenticated,
} from '../services/auth';

interface ParticipantProtectedRouteProps {
  element: JSX.Element;
}

const ParticipantProtectedRoute = ({ element }: ParticipantProtectedRouteProps) => {
  const location = useLocation();
  const urlToken = getTokenFromLocation(location) ?? undefined;
  
  // Always force participant role for this component
  const role = 'participant';

  // Check for existing token in localStorage first
  const existingToken = localStorage.getItem('participant_bitshala');
  const tokenToUse = existingToken || urlToken;

  // Save token to localStorage when authenticated (only if we don't already have one)
  useEffect(() => {
    if (urlToken && !existingToken && isParticipantAuthenticated(urlToken, role)) {
      localStorage.setItem('participant_bitshala', urlToken);
      console.log('✅ New participant token saved to localStorage as participant_bitshala');
    } else if (existingToken) {
      console.log('🔄 Using existing participant token from localStorage');
    }
  }, [urlToken, existingToken, role]);

  return isParticipantAuthenticated(tokenToUse, role) ? element : <Navigate to="/instructions" replace />;
};

export default ParticipantProtectedRoute;