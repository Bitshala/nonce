import React from 'react';
import { useNavigate } from 'react-router-dom';

interface GeneralInstructionsProps {
  cohortName: string;
}

const GeneralInstructions: React.FC<GeneralInstructionsProps> = ({
  cohortName,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-zinc-400 hover:text-white transition-colors mb-8 border-0 bg-transparent"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <h1 className="text-4xl font-bold mb-6 text-orange-400">Welcome to Bitshala Cohort</h1>
          <p className="text-xl text-zinc-300 leading-relaxed">
            These general instructions are aimed at helping you navigate through the program successfully.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* Introduction Session */}
          <section>
            <h2 className="text-3xl font-bold mb-6 text-orange-400">Introduction Session</h2>
            <div className="text-zinc-200 text-lg leading-relaxed space-y-4">
              <p>
                The program begins with an introductory session. This is an ice-breaker between participants and the Bitshala team where we share what to expect in the coming <span className="text-orange-400 font-semibold">8 weeks</span>. It would be a great place to introduce oneself, get to know each other, and discuss the course structure. We will also have an intro session by Bitshala Team on <span className="text-orange-400 font-semibold">Bitcoin dev career</span>!
              </p>
            </div>
          </section>

          {/* Communication & Attendance */}
          <section>
            <h2 className="text-3xl font-bold mb-6 text-orange-400">Communication & Attendance</h2>
            <div className="text-zinc-200 text-lg leading-relaxed space-y-4">
              <p>
                <span className="text-blue-400 font-semibold">Discord</span> will be the primary means of communication. We will host all our sessions, discussions and doubt clearing on Discord, every week at the same time and same day. This will also be visible over your google calendar. Participants are expected to attend every week. We allow <span className="text-green-400 font-semibold">one absence</span> for emergencies or previous conflicts. If you miss more than <span className="text-red-400 font-semibold">2 meetings</span>, we advise you to re-join the next cohort. We do it every 2 months i.e. 8 weeks.
              </p>
              <p>
                To begin with please introduce yourself at Bitshala Discord (in the <span className="text-blue-400 font-semibold">#Intro channel</span>). Say a little bit about yourself, what you do for work and something you do for fun. These groups work best when we get to know each other. If you don't want to use your personal photo as your icon, that is totally fine. Just please change it to a unique image.
              </p>
            </div>
          </section>

          {/* Overview */}
          <section>
            <h2 className="text-3xl font-bold mb-6 text-orange-400">Overview of the Study Cohort</h2>
            <div className="text-zinc-200 text-lg leading-relaxed space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-zinc-100">Duration</h3>
                <p>Weekly sessions.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-zinc-100">Registered Participants</h3>
                <ul className="space-y-2 ml-6">
                  <li className="flex items-start">
                    <span className="text-orange-400 mr-3">•</span>
                    <span>Registered participants will be enrolled</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-400 mr-3">•</span>
                    <span>Participants will be provided with weekly question sets</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-orange-400 mr-3">•</span>
                    <span>They are required to prepare by reading designated chapters and completing any practice examples in the book</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-zinc-100">Open Participation</h3>
                <ul className="space-y-2 ml-6">
                  <li className="flex items-start">
                    <span className="text-orange-400 mr-3">•</span>
                    <span>Non-registered participants are welcome to attend and benefit from the discussions but will not be profiled or receive certificates.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Session Structure */}
          <section>
            <h2 className="text-3xl font-bold mb-6 text-orange-400">Session Structure</h2>
            <div className="text-zinc-200 text-lg leading-relaxed space-y-4">
              <h3 className="text-xl font-semibold mb-3 text-zinc-100">60-Minute Group Discussion</h3>
              <ul className="space-y-2 ml-6">
                <li className="flex items-start">
                  <span className="text-green-400 mr-3">•</span>
                  <span>All the participants will show up in one voice channel with the Teaching Assistants (TAs)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3">•</span>
                  <span>Questions will be allocated to participants within each group, with priority given to registered participants</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-3">•</span>
                  <span>TAs will facilitate the discussion, assess answers, and provide feedback</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-400 mr-3">•</span>
                  <span>Participants can seek clarification on concepts and exercises from the chapter</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Participant Profiling */}
          <section>
            <h2 className="text-3xl font-bold mb-6 text-orange-400">Participant Profiling and Evaluation</h2>
            <div className="text-zinc-200 text-lg leading-relaxed space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-zinc-100">Grading</h3>
                <p>Participants will be evaluated by TAs based on their answers and demonstrated technical competency.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-zinc-100">Performance Profiling</h3>
                <ul className="space-y-2 ml-6">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-3">•</span>
                    <span>Profiles will include strengths, areas for improvement, and overall progress.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-3">•</span>
                    <span>These profiles will serve as feedback for the participants and guide TAs in providing targeted support.</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-zinc-100">Completion Certificate</h3>
                <p>Certificates will be awarded to <span className="text-green-400 font-semibold">registered participants</span> who actively participate and perform satisfactorily throughout the cohort.</p>
              </div>
            </div>
          </section>

          {/* Open Participation Policy */}
          <section>
            <h2 className="text-3xl font-bold mb-6 text-orange-400">Open Participation Policy</h2>
            <div className="text-zinc-200 text-lg leading-relaxed">
              <ul className="space-y-2 ml-6">
                <li className="flex items-start">
                  <span className="text-green-400 mr-3">•</span>
                  <span>Non-registered participants are encouraged to join and benefit from the discussions.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-3">•</span>
                  <span>However, they will not be profiled, graded, or eligible for completion certificates.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3">•</span>
                  <span>Priority to answer questions will be given to registered participants.</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default GeneralInstructions;
