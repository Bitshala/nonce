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

export default function InstructionsWeekFour() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const [, setLoading] = useState(false);

  // Load saved data from localStorage when component mounts
  useEffect(() => {
    // Try to load saved data from localStorage
    const savedData = localStorage.getItem('week4_student_data');
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
        localStorage.removeItem('week4_student_data');
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
        
        localStorage.setItem('week4_student_data', JSON.stringify({
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
        
        navigate('/instructions/4', { 
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
      navigate('/instructions/4', { 
        replace: true,
        state: { email: email || userEmail, username: name || username }
      });
    }
  }, [location, navigate, studentData.length, fetchStudentData, userEmail, username]);

  const week4Data = studentData.find(data => data.week === 4);

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
              <span className="text-gray-300 text-sm">Terminal — week_4_instructions.sh</span>
            </div>
          </div>

          {/* Terminal Content */}
          <div className="p-6 bg-zinc-900">
            {/* Terminal command header */}
            <div className="mb-6 pb-3 border-b border-orange-300">
              <div className="text-orange-300">
                <span className="text-orange-400">user@bitshala:~$</span> week_4_instructions.sh --week=4
              </div>
              <div className="text-orange-200 text-sm mt-1">
                Loading Week 4 Programming Bitcoin study instructions
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
                <span className="text-orange-400">[04]</span> Week 4 Instructions
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
                Welcome to Week 4 of the <span className="text-orange-300 font-semibold">Programming Bitcoin</span> Study Cohort.
                This week we explore <span className="text-orange-300 font-semibold">Scripts and Transactions</span>.
              </div>
            </div>

            {/* Week 4 Group Assignment */}
            {week4Data && (
              <div className="mb-8 bg-zinc-800 border border-orange-400 overflow-hidden">
                <div className="bg-zinc-700 px-4 py-3 border-b border-orange-400">
                  <h2 className="text-xl font-semibold text-orange-300">
                    <span className="text-orange-400">[GROUP_ASSIGNMENT]</span> Your Week 4 Group
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-700 border border-orange-400 p-4">
                      <div className="text-orange-400 text-sm mb-2">GROUP_ID</div>
                      <div className="text-xl text-orange-300 font-semibold">{week4Data.group_id}</div>
                      <div className="mt-3">
                        <a href="#" className="text-orange-200 hover:text-orange-300 underline text-sm">
                          → Discord Channel
                        </a>
                      </div>
                    </div>
                    <div className="bg-zinc-700 border border-orange-400 p-4">
                      <div className="text-orange-400 text-sm mb-2">TEACHING_ASSISTANT</div>
                      <div className="text-xl text-orange-300 font-semibold">{week4Data.ta}</div>
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
                    "Read Chapter 6 (Script) and Chapter 7 (Transaction creation) from the GitHub repository",
                    "Review the assigned group, chapter(s), and question(s) provided below",
                    "Join the assigned Group Discussion room on time",
                    "Introduce yourself and answer the assigned questions during group discussion",
                    "Return to the main hall to conclude with all participants",
                    "Complete and submit the weekly exercise"
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
                <div className="space-y-4">
                  <div className="bg-zinc-700 border border-orange-400 p-4">
                    <h3 className="text-orange-300 font-semibold mb-2">Chapter 6: Script</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <a href="https://github.com/jimmysong/programmingbitcoin/blob/master/ch06.asciidoc" 
                           className="text-orange-200 hover:text-orange-300 underline">
                          → Chapter 6: Script
                        </a>
                      </div>
                      <div>
                        <a href="https://github.com/jimmysong/programmingbitcoin/tree/master/code-ch06" 
                           className="text-orange-200 hover:text-orange-300 underline">
                          → Chapter 6 Code
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="bg-zinc-700 border border-orange-400 p-4">
                    <h3 className="text-orange-300 font-semibold mb-2">Chapter 7: Transaction creation</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <a href="https://github.com/jimmysong/programmingbitcoin/blob/master/ch07.asciidoc" 
                           className="text-orange-200 hover:text-orange-300 underline">
                          → Chapter 7: Transaction creation
                        </a>
                      </div>
                      <div>
                        <a href="https://github.com/jimmysong/programmingbitcoin/tree/master/code-ch07" 
                           className="text-orange-200 hover:text-orange-300 underline">
                          → Chapter 7 Code
                        </a>
                      </div>
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
                    <span className="text-orange-400">[BITCOIN_SCRIPT]</span> Script & Transaction Questions
                  </h3>
                  <ul className="space-y-3 text-orange-200 text-sm">
                    <li>• Highlight the differences between native segwit and nested segwit? Which is better? Why nested segwit was required? Discuss script execution of nested segwit scripts.</li>
                    <li>• What are the differences between P2SH and P2WSH? Which is better in terms of security and why?</li>
                    <li>• What are non-standard output scripts? Give an example. Is there a way to use non-standard script on bitcoin network?</li>
                    <li>• What are OP_NOPs? Why do we have them in bitcoin? Why CLTV and CSV opcodes have to be succeeded with OP_DROP opcode? Will other OP_NOPs also have to be followed by OP_DROP?</li>
                    <li>• What should be the state of the stack after a script execution? What is clean stack rule and why is it important? Is it a policy rule or consensus rule?</li>
                  </ul>
                </div>
                
                <div className="bg-zinc-700 border border-orange-400 p-4">
                  <h3 className="text-orange-300 font-semibold mb-3">
                    <span className="text-orange-400">[TRANSACTIONS]</span> Transaction Structure & Processing
                  </h3>
                  <ul className="space-y-3 text-orange-200 text-sm">
                    <li>• What are the different components of the transaction? Discuss each of them briefly. Discuss the changes in transaction structure before and after segwit upgrade.</li>
                    <li>• Discuss the signature verification process for multisig. Why all multisig transactions have a dummy value (OP_0) at the beginning of the unlocking script? Why would fixing this be a hard fork?</li>
                    <li>• Discuss different Sighash types along with their usecases. Which part of the transaction is hashed in each sighash type?</li>
                    <li>• Why do we encode addresses in base58 instead of base64? Discuss advantages of bech32 over base58 encoding format.</li>
                    <li>• What are different sources of transaction malleability and how did the segwit upgrade fix it?</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Exercise */}
            <div className="bg-zinc-800 border border-orange-400 overflow-hidden">
              <div className="bg-zinc-700 px-4 py-3 border-b border-orange-400">
                <h2 className="text-xl font-semibold text-orange-300">
                  <span className="text-orange-400">[EXERCISE]</span> Week 4 Assignment
                </h2>
              </div>
              <div className="p-6">
                <div className="bg-zinc-700 border border-orange-400 p-4 mb-4">
                  <div className="text-orange-300 font-semibold mb-2">Assignment Repository</div>
                  <div className="text-orange-200 text-sm">
                        <a href="https://classroom.github.com/a/NeLKR9ZA" 
                          className="text-orange-200 hover:text-orange-300 underline">
                          → https://classroom.github.com/a/NeLKR9ZA
                        </a>
                  </div>
                </div>
                
                <div className="bg-zinc-700 border border-orange-400 p-4 mb-4">
                  <div className="text-orange-400 text-sm mb-3">TOPICS_COVERED:</div>
                  <div className="space-y-2 text-orange-200 text-sm">
                    <div><span className="text-orange-400">[1]</span> Bitcoin Script execution and validation</div>
                    <div><span className="text-orange-400">[2]</span> Segwit implementation (native vs nested)</div>
                    <div><span className="text-orange-400">[3]</span> P2SH vs P2WSH comparison</div>
                    <div><span className="text-orange-400">[4]</span> OP_NOPs and script opcodes</div>
                    <div><span className="text-orange-400">[5]</span> Transaction structure and components</div>
                    <div><span className="text-orange-400">[6]</span> Multisig signature verification</div>
                    <div><span className="text-orange-400">[7]</span> Sighash types and their applications</div>
                    <div><span className="text-orange-400">[8]</span> Address encoding (Base58 vs Bech32)</div>
                    <div><span className="text-orange-400">[9]</span> Transaction malleability and Segwit fixes</div>
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