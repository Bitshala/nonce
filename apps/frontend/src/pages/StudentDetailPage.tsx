import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft, Download, Calendar } from 'lucide-react';


import { StudentBackground } from '../components/student/StudentBackground';
import { StudentSummary } from '../components/student/StudentSummary';
import { WeeklyProgressChart } from '../components/student/WeeklyProgressChart';
import { WeeklyBreakdownCard } from '../components/student/WeeklyBreakdownCard';

import { fetchGithubUsername, fetchStudentData, fetchStudentBackgroundData } from '../services/studentService';
import { getStudentNameFromUrl, exportStudentData } from '../utils/studentUtils';
import { calculateStudentStats } from '../utils/calculations';
import { decodeUsername, validateUserAccess } from '../utils/tokenUtils';
import type { StudentData, StudentBackground as StudentBgType } from '../types/student';

const StudentDetailPage = () => {
  const navigate = useNavigate();
  const { studentName: paramStudentName } = useParams();
  const [searchParams] = useSearchParams();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [studentBackground, setStudentBackground] = useState<StudentBgType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get student name from URL params, search params, or secure token
  const getStudentName = useCallback((): string | null => {
    // Try to get from URL params first (legacy support)
    if (paramStudentName) return decodeURIComponent(paramStudentName);

    // Check for secure token parameter
    const token = searchParams.get('token');
    if (token) {
      const decodedUsername = decodeUsername(token);
      if (decodedUsername && validateUserAccess(decodedUsername)) {
        return decodedUsername;
      } else {
        // Token validation failed
        setError('Access denied: Invalid or expired session token');
        return null;
      }
    }

    // Fallback to legacy student parameter
    const fromParams = searchParams.get('student');
    if (fromParams) {
      // Validate against authenticated user for legacy URLs
      if (!validateUserAccess(fromParams)) {
        setError('Access denied: Unauthorized user access attempt');
        return null;
      }
      return fromParams;
    }

    return getStudentNameFromUrl();
  }, [paramStudentName, searchParams]);

  // Load student data
  const loadStudentData = async (name: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const studentData = await fetchStudentData(name);
      setStudent(studentData);

      // Fetch background data if student has email
      if (studentData?.email) {
        try {
          const backgroundData = await fetchStudentBackgroundData(studentData.email);
          setStudentBackground(backgroundData);
        } catch (bgErr) {
          console.warn('Failed to fetch background data:', bgErr);
          // Don't set error for background data failure
        }
      }
    } catch (err) {
      console.error('Error loading student data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const getGithubUsername = async (name: string) => {
    const githubUsername = await fetchGithubUsername(name);
    console.log("gith",githubUsername);
    window.open(`https://ghstats.bitcoinsearch.xyz/result?username=${githubUsername}`, '_blank')
  }

  useEffect(() => {
    const name = getStudentName();
    if (name) {
      loadStudentData(name);
    } else {
      setError('No student name provided');
      setLoading(false);
    }
  }, [paramStudentName,getStudentName]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleExport = () => {
    exportStudentData(student);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="text-xl">Loading student data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const isSecurityError = error.includes('Access denied');
    
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto" />
          <h2 className="text-2xl font-bold text-red-400">
            {isSecurityError ? 'Access Denied' : 'Error Loading Student Data'}
          </h2>
          <p className="text-zinc-400">{error}</p>
          {isSecurityError && (
            <p className="text-yellow-400 text-sm">
              Please log in again or select a cohort from the main page.
            </p>
          )}
          <div className="space-x-4">
            <button 
              onClick={() => navigate('/cohortSelector')}
              className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-md transition-colors"
            >
              {isSecurityError ? 'Go to Login' : 'Select Cohort'}
            </button>
            {!isSecurityError && (
              <button 
                onClick={() => {
                  const name = getStudentName();
                  if (name) loadStudentData(name);
                }}
                className="bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-md transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No student data
  if (!student) {
    return (
      <div className="min-h-screen bg-zinc-900 text-zinc-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-amber-400 mx-auto" />
          <h2 className="text-2xl font-bold">No Student Data</h2>
          <p className="text-zinc-400">Student data could not be loaded.</p>
          <button 
            onClick={handleGoBack}
            className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-md transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const stats = calculateStudentStats(student.weeklyData);
  const validWeeks = student.weeklyData.filter(week => week.week > 0);

  return (
    <div className="min-h-screen bg-zinc-800 text-zinc-100">
      {/* Header Terminal Window */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-zinc-900 border border-orange-300 shadow-2xl font-mono rounded-lg overflow-hidden">
          {/* Terminal Window Header */}
          <div className="bg-zinc-700 px-4 py-3 flex items-center space-x-2 border-b border-orange-300">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex-1 text-center">
              <span className="text-gray-300 text-sm">Terminal — student_profile.sh</span>
            </div>
          </div>

          {/* Terminal Content */}
          <div className="p-6 bg-zinc-900">
            {/* Terminal command header */} 

            {/* Navigation and Actions */}
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={handleGoBack}
                className="b-0 rounded-md flex items-center space-x-2 bg-zinc-700 text-orange-300 hover:bg-zinc-600 border border-orange-300 hover:border-orange-400 p-2 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Students</span>
              </button>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => navigate('/instructions')}
                  className="b-0 rounded-md flex items-center space-x-2 px-4 py-2 bg-zinc-700 text-orange-300 hover:bg-zinc-600 border border-orange-400 transition-colors font-mono"
                >
                  <span className="text-orange-400">►</span>
                  <span>General Instructions</span>
                </button>
                
                <button 
                  onClick={() => navigate('/result')}
                  className="b-0 rounded-md flex items-center space-x-2 px-4 py-2 bg-zinc-700 text-orange-300 hover:bg-zinc-600 border border-orange-400 transition-colors font-mono"
                >
                  <span className="text-orange-400">►</span>
                  <span>View Leaderboard</span>
                </button>
                
                <button 
                  onClick={handleExport}
                  className="b-0 rounded-md flex items-center space-x-2 px-4 py-2 bg-orange-400 text-zinc-900 hover:bg-orange-500 border border-orange-300 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Data</span>
                </button>
              </div>
            </div>
            
            {/* Student Info */}
            <div className="mb-6 pb-4 border-b border-orange-400">
              <div className="flex items-center space-x-6">
                <div>
                  <h1 className="text-3xl font-bold text-orange-300 cursor-pointer hover:text-orange-400 transition-colors" onClick={() => getGithubUsername(student.name)}>{student.name}</h1>
                  <div className="flex items-center space-x-6 text-orange-200 mt-2">
                    <span className="text-orange-400">[EMAIL]</span>
                    <span>{student.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Background */}
            {studentBackground && (
              <div className="mb-6">
                <StudentBackground background={studentBackground} />
              </div>
            )}

            {/* Summary Stats */}
            <div className="mb-6">
              <StudentSummary stats={stats} />
            </div>
            
            {/* Progress Chart */}
            <WeeklyProgressChart weeklyData={validWeeks} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Weekly Breakdown */}
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-6 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Detailed Weekly Breakdown
          </h2>
          <div className="space-y-6">
            {validWeeks.slice(0, 5).map((week) => (
              <WeeklyBreakdownCard 
                key={week.week} 
                week={week} 
                studentName={student.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailPage;