import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../hooks/userHooks';
import { useAuth } from '../hooks/useAuth';


function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, token: storedToken } = useAuth();


  const { data: user } = useUser();

  console.log("user", user);

  useEffect(() => {
    const handleCallback = async () => {
      // Extract session_id from URL query params
      const searchParams = new URLSearchParams(location.search);
      const sessionId = searchParams.get('session_id');

      // If session_id exists in URL
      if (sessionId) {
        // Check if it's different from stored token
        if (storedToken !== sessionId) {
          // Replace token in localStorage and authenticate
          login(sessionId);
        }
      } else if (!storedToken || !user) {
        // No token in URL, no stored token, or user undefined - redirect to login
        navigate("/login");
        return;
      }

      if( user?.role === "TEACHING_ASSISTANT" || user?.role ==="ADMIN"){
        navigate("/select")
      }
      else if (user?.role === "STUDENT") {
        navigate("/student");
      }

    };

    handleCallback();
  }, [location, navigate, user, login, storedToken]);

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