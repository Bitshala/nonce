import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../hooks/userHooks';


function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: user } = useUser();

  console.log("user", user);
  
  useEffect(() => {
    const handleCallback = async () => {
      if( user?.role === "TEACHING_ASSISTANT" || user?.role ==="ADMIN"){
        navigate("/select")
      }
      else if (user?.role === "STUDENT") {
        navigate("/student");
      }
    
    };

    handleCallback();
  }, [location, navigate, user?.role]);

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