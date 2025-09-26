import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// import { handleDiscordCallback } from '../services/auth';

function OAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      console.log("stop")
      // const success = await handleDiscordCallback(location, navigate);

      // if (!success) {
      //   console.error('Failed to handle Discord callback');
      //   navigate('/', { replace: true });
      // }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center font-mono">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        <p className="text-zinc-400">Processing authentication...</p>
      </div>
    </div>
  );
}

export default OAuthCallback;