import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { handleDiscordCallback } from '../../services/auth';

export default function Instructions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  // Handle Discord callback
  useEffect(() => {
    // Check if this is a Discord auth callback
    const params = new URLSearchParams(location.search);
    if (params.get('auth') === 'discord') {
      handleDiscordCallback(location, navigate);
    }
    
    // Extract email and username from location state or URL params
    const email = location.state?.email || params.get('email');
    const name = location.state?.username || params.get('username');
    
    if (email) setUserEmail(email);
    if (name) setUsername(name);
  }, [location, navigate]);
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-semibold text-gray-800">Programming Bitcoin Cohort General Instructions</h2>
        {userEmail && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-w-md mx-auto">
            <p className="text-sm text-green-800">
              Welcome, <span className="font-semibold">{username || 'Participant'}</span>!
            </p>
            <p className="text-xs text-green-600">Email: {userEmail}</p>
          </div>
        )}
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Welcome to the <a href="#" className="text-blue-600 hover:underline">Programming Bitcoin</a> Study Cohort. 
          This general instruction sheet is aimed at helping you make the most out of the program.
        </p>
      </div>

      {/* Program Overview */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            📖 Program Overview
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-semibold">Introductory Session</p>
            <p className="text-sm text-gray-700">Friday, May 30th, at 8:00 PM IST (2:30 PM UTC)</p>
            <p className="text-sm">Icebreaker session with participants and the Bitshala team, featuring Raj Maitra, Lead at Bitshala.</p>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold">Weekly Structure (7 weeks):</h4>
            
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg border-l-4 border-l-green-500">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="text-lg font-semibold">Weekly Preparation</h4>
                </div>
                <div className="p-4">
                  <p className="text-sm">Review weekly chapters, public questions, bonus questions, and exercises in the 
                    <a href="#" className="text-blue-600 hover:underline ml-1">GitHub Repo</a>. 
                    Also posted on Discord notice-board and Google Calendar.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg border-l-4 border-l-blue-500">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    👥 Group Discussions
                  </h4>
                </div>
                <div className="p-4 space-y-2">
                  <div className="text-sm space-y-1">
                    <p>Each Friday, join assigned Discord voice channels</p>
                    <p>Groups of 4-6 participants</p>
                    <p>Questions assigned via flywheel app</p>
                    <p>60 minutes discussion</p>
                    <p>30 minutes collective exercises discussion</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg border-l-4 border-l-purple-500">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="text-lg font-semibold">Weekly Exercises</h4>
                </div>
                <div className="p-4">
                  <p className="text-sm">Cover study topics for the week. Submit by cohort end date plus two weeks. 
                    Reviewed and graded by TAs based on coding quality.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scoring System */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            ⭐ Scoring System
          </h3>
        </div>
        <div className="p-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-lg">1. Group Discussion (GD)</h4>
              <span className="inline-block px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded">Max 100 points/week</span>
              <ul className="text-sm space-y-1">
                <li>Communication: up to 30 points</li>
                <li>Depth of Answer: up to 30 points</li>
                <li>Technical Bitcoin Fluency: up to 20 points</li>
                <li>Engagement: up to 20 points</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-lg">2. Bonus Questions</h4>
              <span className="inline-block px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded">Max 50 points/question</span>
              <ul className="text-sm space-y-1">
                <li>Attempted the question: 30 points</li>
                <li>Elaborate explanation: 10 points</li>
                <li>Additional relevant questions: 10 points</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-lg">3. Weekly Exercises</h4>
              <span className="inline-block px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded">Max 100 points/exercise</span>
              <ul className="text-sm space-y-1">
                <li>Solution commit: 25 points</li>
                <li>All tests passing: 25 points</li>
                <li>Well-documented code: 25 points</li>
                <li>Readable code: 25 points</li>
                <li className="text-red-600 font-medium">Plagiarized code: -100 points ❌</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Certificates */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            🏆 Certificates
          </h3>
        </div>
        <div className="p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold">Certificate of Participation</h4>
              <p className="text-sm text-gray-700">Issued to participants who complete GD sessions but do not submit exercises.</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold">Certificate of Achievement</h4>
              <p className="text-sm text-gray-700">Issued only to participants who submit all exercises.</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium">
              ✅ Only participants who complete and submit exercises are eligible for Bitshala Fellowships.
            </p>
          </div>
        </div>
      </div>

      {/* Communication and Participation */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            💬 Cohort Communication and Participation
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold">Communication Platform</h4>
              <p className="text-sm">Discord will be the primary communication platform.</p>
              
              <h4 className="font-semibold">Attendance Requirements</h4>
              <div className="text-sm space-y-1">
                <p>• Weekly meetings visible on Google calendar</p>
                <p>• Must attend every session</p>
                <p className="text-red-600 font-medium">
                  ⚠️ More than two absences = removal from cohort
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold">Getting Started</h4>
              <div className="text-sm space-y-1">
                <p>• Introduce yourself in Discord's #Intro channel</p>
                <p>• Share background, work, and interests</p>
                <p>• Use unique icon if uncomfortable with personal photo</p>
                <p>• Cameras must be on during sessions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            ⏰ Weekly Session Breakdown
          </h3>
        </div>
        <div className="p-4 py-2">
          <p className="text-sm">60 minutes of group discussion</p>
        </div>
      </div>

      {/* Tools and TA Responsibilities */}
      
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-xl font-semibold">Tools</h3>
          </div>
          <div className="p-4 space-y-2">
            <div>
              <h4 className="font-semibold">Flywheel App</h4>
              <p className="text-sm text-gray-600">Used for randomly assigning GD questions</p>
            </div>
            <div>
              <h4 className="font-semibold">Buzzer App</h4>
              <p className="text-sm text-gray-600">Indicate willingness to answer private questions during GD sessions</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-xl font-semibold">Bitshala TA Responsibilities</h3>
          </div>
          <div className="p-4">
            <ul className="text-sm space-y-1">
              <li>Coordinate GDs and assign questions</li>
              <li>Clarify questions when needed</li>
              <li>Conduct brief recaps and evaluations</li>
              <li>Grade exercises and provide feedback</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            📅 Schedule
          </h3>
        </div>
        <div className="p-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Week 1:</span>
              <span className="text-sm">Introductory week</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Week 2:</span>
              <span className="text-sm">Chapters 1 and 2 – 
                <a href="#" className="text-blue-600 hover:underline ml-1">Finite Fields</a> and{' '}
                <a href="#" className="text-blue-600 hover:underline ml-1">Elliptic Curves</a>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Week 3:</span>
              <span className="text-sm">Chapter 3 – 
                <a href="#" className="text-blue-600 hover:underline ml-1">Elliptic Curve Cryptography</a>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Week 4:</span>
              <span className="text-sm">Chapters 4 and 5 – 
                <a href="#" className="text-blue-600 hover:underline ml-1">Serialization</a> and{' '}
                <a href="#" className="text-blue-600 hover:underline ml-1">Transactions</a>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Week 5:</span>
              <span className="text-sm">Chapters 6 and 7 – 
                <a href="#" className="text-blue-600 hover:underline ml-1">Scripts</a> and{' '}
                <a href="#" className="text-blue-600 hover:underline ml-1">Transaction Validation</a>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Week 6:</span>
              <span className="text-sm">Chapters 8 and 9 – 
                <a href="#" className="text-blue-600 hover:underline ml-1">P2SH</a> and{' '}
                <a href="#" className="text-blue-600 hover:underline ml-1">Blocks</a>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Week 7:</span>
              <span className="text-sm">Chapters 10 and 11 – 
                <a href="#" className="text-blue-600 hover:underline ml-1">Networking</a> and{' '}
                <a href="#" className="text-blue-600 hover:underline ml-1">Simplified Payment Verification</a>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium">Week 8:</span>
              <span className="text-sm">Chapters 12 and 13 – 
                <a href="#" className="text-blue-600 hover:underline ml-1">Bloom Filters</a> and{' '}
                <a href="#" className="text-blue-600 hover:underline ml-1">SegWit</a>
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="font-medium">Week 9:</span>
              <span className="text-sm">Conclusion and reflections on future steps</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Group Discussion */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-xl font-semibold">Sample Group Discussion Sessions</h3>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600">
            All participants will be assigned in groups. Here's an example of how group discussions work with 2 groups (A and B) each with 2 participants:
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Group A</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Member</th>
                      <th className="p-2 text-left">Question</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border-t">Alice 🤠</td>
                      <td className="p-2 border-t">Why is the sky blue?</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-t">Carol</td>
                      <td className="p-2 border-t">Who invented the lightbulb?</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Group B</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Member</th>
                      <th className="p-2 text-left">Question</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border-t">Bob</td>
                      <td className="p-2 border-t">Why is the sky blue?</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-t">Don 🤠</td>
                      <td className="p-2 border-t">Who invented the lightbulb?</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold">Discussion Process:</h4>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <p className="text-sm">
                <strong>1. Individual Preparation:</strong> Participants prepare answers and follow-up questions for their assigned topic.
              </p>
              <p className="text-sm">
                <strong>2. Group Discussion (60 min):</strong> Alice reports to Group A, Bob to Group B. Members take turns hosting discussions for their questions.
              </p>
              <p className="text-sm">
                <strong>3. Main Hall Discussion (30 min):</strong> All participants reconvene to address unanswered questions and clear up confusion.
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="font-semibold text-sm mb-2">Example Answer Development:</h5>
              <p className="text-sm italic mb-2">
                "Violet and blue light have the shortest wavelengths, and red light has the longest. Therefore, blue light is scattered more than red light, and the sky appears blue during the day."
              </p>
              <p className="text-sm"><strong>Follow-up questions might include:</strong></p>
              <ul className="text-sm ml-4 mt-1">
                <li>• What are wavelengths specifically?</li>
                <li>• What does "scattering" mean in this sense?</li>
                <li>• Can you think of things that appear red?</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Student Feedback */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-xl font-semibold">Student Feedback</h3>
        </div>
        <div className="p-4">
          <p className="text-sm">
            A feedback form will be shared halfway through the cohort to continuously improve our learning structure.
          </p>
        </div>
      </div>

      {/* Navigation to Week Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-gray-200 rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            📅 Weekly Instructions
          </h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Access specific weekly instructions and assignments:
          </p>
          <div className="flex flex-wrap gap-2">
            <a 
              href="/instructions/1" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📚 Week 1 Instructions
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}