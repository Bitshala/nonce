import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { encodeUsername } from '../../utils/tokenUtils';

export default function StudentCohortSelector() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLbtclPopup, setShowLbtclPopup] = useState(false);


  const cohorts = [
    { 
      id: 'lbcl_cohort', 
      name: 'Learning Bitcoin via Command Line', 
      description: 'Bitcoin CLI and RPC interface exploration',
      status: 'Active',
      dbPath: 'lbtcl_cohort.db'
    },
    { 
      id: 'pb_cohort', 
      name: 'Programming Bitcoin Cohort', 
      description: 'Bitcoin protocol implementation study',
      status: 'Active',
      dbPath: 'pb_cohort.db'
    }
  ];

  // Extract URL parameters and store in localStorage when component mounts
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    console.log('🔄 StudentCohortSelector: Processing URL parameters');
    
    // Extract common parameters that might be passed from backend
    const email = params.get('email');
    const username = params.get('username');
    const token = params.get('token');
    const role = params.get('role');
    const cohort = params.get('cohort');
    const auth = params.get('auth');
    
    // Store user authentication info if available
    if (email) {
      localStorage.setItem('user_email', email);
      console.log('✅ Stored user email:', email);
    }
    
    if (username) {
      localStorage.setItem('user_username', username);
      console.log('✅ Stored username:', username);
    }
    
    if (token) {
      localStorage.setItem('user_token', token);
      console.log('✅ Stored user token');
    }
    
    if (role) {
      localStorage.setItem('user_role', role);
      console.log('✅ Stored user role:', role);
    }
    
    if (auth) {
      localStorage.setItem('auth_method', auth);
      console.log('✅ Stored auth method:', auth);
    }
    
    // If a specific cohort is specified in the URL, pre-select it
    if (cohort) {
      const cohortMapping: { [key: string]: string } = {
        'lbtcl': 'lbcl_cohort',
        'pb': 'pb_cohort',
        'lbtcl_cohort': 'lbcl_cohort',
        'pb_cohort': 'pb_cohort'
      };
      
      const mappedCohort = cohortMapping[cohort.toLowerCase()];
      if (mappedCohort) {
        console.log('🎯 Pre-selected cohort from URL:', mappedCohort);
        localStorage.setItem('preselected_cohort', mappedCohort);
      }
    }
    
    // Store timestamp for session tracking
    localStorage.setItem('session_start', Date.now().toString());
    
    // Clean up URL by removing query parameters after processing
    if (location.search) {
      console.log('🧹 Cleaning up URL parameters');
      navigate('/cohortSelector', { replace: true });
    }
    
  }, [location.search, navigate]);

  const handleCohortClick = async (cohortId: string) => {
    // Show popup for LBTCL cohort
    if (cohortId === 'lbcl_cohort') {
      setShowLbtclPopup(true);
      return;
    }

    const cohort = cohorts.find(c => c.id === cohortId);
    if (!cohort) return;

    try {
      console.log(`🔄 Switching to ${cohort.name} with database: ${cohort.dbPath}`);
      
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
      const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN_TA;
      
      const response = await fetch(`${API_BASE_URL}/switch_cohort`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `${AUTH_TOKEN}`,
        },
        body: JSON.stringify({ db_path: cohort.dbPath }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Successfully switched to ${cohort.name}:`, result.message);
        
        // Store the selected cohort info in localStorage
        localStorage.setItem('selected_cohort_id', cohortId);
        localStorage.setItem('selected_cohort_db_path', cohort.dbPath);
        localStorage.setItem('selected_cohort_name', cohort.name);
        
        // Navigate to cohort-specific page with encoded token
        const encodedToken = encodeUsername(username);
        navigate(`/detailPage?token=${encodedToken}`);
      } else {
        console.error(`❌ Failed to switch to ${cohort.name}:`, result.message);
        alert(`Failed to switch cohort: ${result.message}`);
      }
    } catch (error) {
      console.error(`💥 Error switching to ${cohort.name}:`, error);
      alert(`Error switching cohort: ${error}`);
    }
  };

  const username = localStorage.getItem('user_username') || 'Student';

  return (
    <div className="bg-zinc-800 font-mono h-screen flex justify-center items-center mx-auto">
      {/* Terminal Window */}
      <div className="w-[1000px] mx-auto bg-zinc-900 rounded-lg shadow-2xl border border-gray-600">
        {/* Terminal Window Header */}
        <div className="bg-zinc-700 rounded-t-lg px-4 py-3 flex items-center space-x-2">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex-1 text-center">
            <span className="text-gray-300 text-sm">select_cohort.sh</span>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="bg-zinc-900 text-orange-300 rounded-b-lg min-h-[600px]">
          {/* Terminal header */}
          <div className="bg-zinc-800 border-b border-orange-300 p-4">
            <div className="text-orange-300">
              <span className="text-orange-400">user@{username}:~$</span> select_cohort.sh
            </div>
            <div className="text-orange-200 text-sm mt-2">
              {(() => {
                const params = new URLSearchParams(location.search);
                const email = params.get('email');
                const username = params.get('username');
                
                if (email || username) {
                  return `Welcome ${username || 'Student'}! Select a cohort you have participated in`;
                }
                return 'Select a cohort you have participated in';
              })()}
            </div>
          </div>

          {/* Terminal content */}
          <div className="p-6">
            <div className="space-y-3">
              {cohorts.map((cohort) => (
                <div 
                  key={cohort.id}
                  className="border border-orange-300 bg-zinc-800 hover:bg-zinc-700 cursor-pointer transition-colors duration-200 group"
                  onClick={() => handleCohortClick(cohort.id)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-orange-400">[{cohort.id.substring(0, 2).toUpperCase()}]</span>
                        <span className="text-orange-300 font-bold">{cohort.name}</span>
                      </div>

                    </div>
                    <div className="mt-2 pl-8 text-orange-400 text-sm">
                      {cohort.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
  
          </div>
        </div>
      </div>

      {/* LBTCL Popup */}
      {showLbtclPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-orange-300 rounded-lg p-6 max-w-md mx-4">
            <div className="text-orange-300 text-center mb-4">
              <h3 className="text-lg font-bold mb-2">LBTCL Cohort</h3>
              <p className="text-orange-200">Cohort data not available at the moment</p>
            </div>
            <button
              onClick={() => setShowLbtclPopup(false)}
              className="w-full bg-zinc-800 border border-orange-300 text-orange-300 py-2 px-4 rounded hover:bg-zinc-700 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}