import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getApiBaseUrl } from '../../services/auth';


interface StudentData {
  name: string;
  mail: string;
  week: number;
  group_discussion_score: number;
  bonus_question_score: number;
  weekly_exercise_score: number;
  total_score: number;
  group_number: number;
  group_id: string;
  ta: string;
  assignment_submitted: boolean;
  attendance_status: string;
}

export default function InstructionsWeekOne() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const [, setLoading] = useState(false);

  // Load saved data from localStorage when component mounts
  useEffect(() => {
    // Try to load saved data from localStorage
    const savedData = localStorage.getItem('week1_student_data');
    const storedEmail = localStorage.getItem('user_email');
    const storedUsername = localStorage.getItem('user_username');

    // Use stored credentials if available
    if (storedEmail) setUserEmail(storedEmail);
    if (storedUsername) setUsername(storedUsername);

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        const isDataFresh = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000;
        
        if (isDataFresh && parsed.email && parsed.studentData) {
          setUserEmail(parsed.email);
          setUsername(parsed.username);
          setStudentData(parsed.studentData);
          console.log('✅ Loaded student data from localStorage');
        }
      } catch (error) {
        console.error('❌ Error parsing saved data:', error);
        localStorage.removeItem('week1_student_data');
      }
    }
  }, []);

  const fetchStudentData = useCallback(async (email: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/individual_data_email/${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setStudentData(data);
        
        localStorage.setItem('week1_student_data', JSON.stringify({
          email,
          username,
          studentData: data,
          timestamp: Date.now()
        }));
        
        console.log(data, "data res");
      } else {
        console.error('Failed to fetch student data');
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  }, [username]);

  // Handle Discord callback and extract user info
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    
    if (params.get('auth') === 'discord') {
      const token = params.get('token');
      const role = params.get('role');
      const email = params.get('email');
      const name = params.get('username');
      
      if (token && role === 'participant') {
        if (email) setUserEmail(email);
        if (name) setUsername(name);
        
        navigate('/instructions/1', { 
          replace: true,
          state: { token, role, email, username: name }
        });
        return;
      }
    }
    
    const email = location.state?.email || params.get('email');
    const name = location.state?.username || params.get('username');
    
    if (email) {
      setUserEmail(email);
      if (studentData.length === 0) {
        fetchStudentData(email);
      }
    }
    if (name) setUsername(name);
    
    if (params.has('email') || params.has('username') || params.has('token') || params.has('role')) {
      navigate('/instructions/1', { 
        replace: true,
        state: { email: email || userEmail, username: name || username }
      });
    }
  }, [location, navigate, studentData.length, fetchStudentData, userEmail, username]);

  const week1Data = studentData.find(data => data.week === 1);

  return (
    <div className="min-h-screen bg-zinc-800 font-mono">
      {/* Terminal Window */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-zinc-900 border border-orange-300 shadow-2xl rounded-lg overflow-hidden">
          {/* Terminal Window Header */}
          <div className="bg-zinc-700 px-4 py-3 flex items-center space-x-2 border-b border-orange-300">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex-1 text-center">
              <span className="text-gray-300 text-sm">Terminal — week_1_instructions.sh</span>
            </div>
          </div>

          {/* Terminal Content */}
          <div className="p-6 bg-zinc-900">
            {/* Terminal command header */}
            <div className="mb-6 pb-3 border-b border-orange-300">
              <div className="text-orange-300">
                <span className="text-orange-400">user@bitshala:~$</span> week_1_instructions.sh --week=1
              </div>
              <div className="text-orange-200 text-sm mt-1">
                Loading Week 1 Programming Bitcoin study instructions
              </div>
            </div>

            {/* Navigation Back */}
            <div className="mb-6">
              <button 
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 bg-zinc-700 text-orange-300 hover:bg-zinc-600 border border-orange-300 hover:border-orange-400 p-2 transition-colors"
              >
                <span>←</span>
                <span>Back to General Instructions</span>
              </button>
            </div>

            {/* Header */}
            <div className="mb-8 pb-4 border-b border-orange-400">
              <h1 className="text-3xl font-bold text-orange-300 mb-4">
                <span className="text-orange-400">[01]</span> Week 1 Instructions
              </h1>
              
              {userEmail && (
                <div className="bg-zinc-800 border border-orange-400 p-4 mb-4">
                  <div className="text-orange-300">
                    <span className="text-orange-400">AUTHENTICATED_USER:</span> {username || 'Participant'}
                  </div>
                  <div className="text-orange-200 text-sm">
                    <span className="text-orange-400">EMAIL:</span> {userEmail}
                  </div>
                </div>
              )}

              <div className="text-orange-200">
                Welcome to Week 1 of the <span className="text-orange-300 font-semibold">Programming Bitcoin</span> Study Cohort.
                Please follow the action items below to prepare for this week's discussion.
              </div>
            </div>

            {/* Week 1 Group Assignment */}
            {week1Data && (
              <div className="mb-8 bg-zinc-800 border border-orange-400 overflow-hidden">
                <div className="bg-zinc-700 px-4 py-3 border-b border-orange-400">
                  <h2 className="text-xl font-semibold text-orange-300">
                    <span className="text-orange-400">[GROUP_ASSIGNMENT]</span> Your Week 1 Group
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-700 border border-orange-400 p-4">
                      <div className="text-orange-400 text-sm mb-2">GROUP_ID</div>
                      <div className="text-xl text-orange-300 font-semibold">{week1Data.group_id}</div>
                      <div className="mt-3">
                        <a href="#" className="text-orange-200 hover:text-orange-300 underline text-sm">
                          → Discord Channel
                        </a>
                      </div>
                    </div>
                    <div className="bg-zinc-700 border border-orange-400 p-4">
                      <div className="text-orange-400 text-sm mb-2">TEACHING_ASSISTANT</div>
                      <div className="text-xl text-orange-300 font-semibold">{week1Data.ta}</div>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-zinc-700 border border-orange-400">
                    <div className="text-orange-300">
                      <span className="text-orange-400">REMINDER:</span> Join your assigned group discussion room on time and work with your TA during the session.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Items */}
            <div className="mb-8 bg-zinc-800 border border-orange-400 overflow-hidden">
              <div className="bg-zinc-700 px-4 py-3 border-b border-orange-400">
                <h2 className="text-xl font-semibold text-orange-300">
                  <span className="text-orange-400">[ACTION_ITEMS]</span> Your Tasks
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {[
                    "Introduce yourself on Discord if you haven't already",
                    "Read Chapters 1 and 2: Finite Fields and Elliptic Curves from the GitHub repository",
                    "Review the assigned group, chapter(s), and question(s) provided below",
                    "Join the assigned Group Discussion room on time",
                    "Introduce yourself and answer the assigned questions during group discussion",
                    "Return to the main hall to conclude with all participants"
                  ].map((item, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="text-orange-400 font-mono">
                        [{(index + 1).toString().padStart(2, '0')}]
                      </div>
                      <div className="text-orange-200">{item}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Week Content */}
            <div className="mb-8 bg-zinc-800 border border-orange-400 overflow-hidden">
              <div className="bg-zinc-700 px-4 py-3 border-b border-orange-400">
                <h2 className="text-xl font-semibold text-orange-300">
                  <span className="text-orange-400">[CONTENT]</span> This Week's Chapters
                </h2>
              </div>
              <div className="p-6">
                <div className="bg-zinc-700 border border-orange-400 p-4">
                  <h3 className="text-orange-300 font-semibold mb-4">Week 1: Chapters 1 and 2 – Finite Fields and Elliptic Curves</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <a href="https://raw.githubusercontent.com/jimmysong/programmingbitcoin/master/ch01.asciidoc" 
                         className="text-orange-200 hover:text-orange-300 underline">
                        → Chapter 1: Finite Fields
                      </a>
                    </div>
                    <div>
                      <a href="https://raw.githubusercontent.com/jimmysong/programmingbitcoin/master/ch02.asciidoc" 
                         className="text-orange-200 hover:text-orange-300 underline">
                        → Chapter 2: Elliptic Curves
                      </a>
                    </div>
                    <div>
                      <a href="https://github.com/jimmysong/programmingbitcoin/tree/master/code-ch01" 
                         className="text-orange-200 hover:text-orange-300 underline">
                        → Chapter 1 Code
                      </a>
                    </div>
                    <div>
                      <a href="https://github.com/jimmysong/programmingbitcoin/tree/master/code-ch02" 
                         className="text-orange-200 hover:text-orange-300 underline">
                        → Chapter 2 Code
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="mb-8 bg-zinc-800 border border-orange-400 overflow-hidden">
              <div className="bg-zinc-700 px-4 py-3 border-b border-orange-400">
                <h2 className="text-xl font-semibold text-orange-300">
                  <span className="text-orange-400">[QUESTIONS]</span> Discussion Topics
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-zinc-700 border border-orange-400 p-4">
                  <h3 className="text-orange-300 font-semibold mb-3">
                    <span className="text-orange-400">[ROUND_1]</span>
                  </h3>
                  <ul className="space-y-3 text-orange-200 text-sm">
                    <li>• What is a modulo operation? What are the mathematical properties of finite fields?</li>
                    <li>• Can you explain what the order of a finite field means? Why are finite fields constructed with a prime modulo?</li>
                    <li>• Explain Fermat's little theorem. What is it used for?</li>
                    <li>• How to express negative numbers in finite field? What would be the positive equivalent of -27mod(5)?</li>
                  </ul>
                </div>
                
                <div className="bg-zinc-700 border border-orange-400 p-4">
                  <h3 className="text-orange-300 font-semibold mb-3">
                    <span className="text-orange-400">[ROUND_2]</span>
                  </h3>
                  <ul className="space-y-3 text-orange-200 text-sm">
                    <li>• What is an elliptic curve? What was the earliest known elliptic curve? Why elliptic curves are useful in cryptography?</li>
                    <li>• Explain elliptic curve point addition in simple terms.</li>
                    <li>• For elliptic curve point addition the last step is to reflect the resulting point across x-axis. Why is this needed? What happens if there was no reflection?</li>
                    <li>• What is the Point of Infinity? What curve operation produces the point of Infinity? Is it useful in real life crypto implementation?</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Exercise */}
            <div className="bg-zinc-800 border border-orange-400 overflow-hidden">
              <div className="bg-zinc-700 px-4 py-3 border-b border-orange-400">
                <h2 className="text-xl font-semibold text-orange-300">
                  <span className="text-orange-400">[EXERCISE]</span> Week 1 Assignment
                </h2>
              </div>
              <div className="p-6">
                <div className="bg-zinc-700 border border-orange-400 p-4 mb-4">
                  <div className="text-orange-300 font-semibold mb-2">Assignment Repository</div>
                  <a href="https://classroom.github.com/a/XKBJqZMI" 
                     className="text-orange-200 hover:text-orange-300 underline">
                    → https://classroom.github.com/a/XKBJqZMI
                  </a>
                </div>
                
                <div className="bg-zinc-700 border border-orange-400 p-4 mb-4">
                  <div className="text-orange-400 text-sm mb-3">SETUP_INSTRUCTIONS:</div>
                  <div className="space-y-2 text-orange-200 text-sm">
                    <div><span className="text-orange-400">[1]</span> Install Python 3.5+</div>
                    <div><span className="text-orange-400">[2]</span> git clone https://github.com/jimmysong/programmingbitcoin</div>
                    <div><span className="text-orange-400">[3]</span> pip install -r requirements.txt</div>
                    <div><span className="text-orange-400">[4]</span> Run Jupyter Notebook</div>
                  </div>
                </div>
                
                <div className="bg-zinc-700 border border-orange-400 p-4">
                  <div className="text-orange-300">
                    <span className="text-orange-400">HELP:</span> For any questions about the exercise, ask in the <span className="font-semibold">#dev-help</span> Discord channel.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}