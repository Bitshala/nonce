import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CohortCard from '../CohortCard';
import { useUser, useUpdateUser } from '../../hooks/userHooks';
import { useCohorts, useJoinCohort } from '../../hooks/cohortHooks';
import { useMyScores } from '../../hooks/scoreHooks';

interface UserProfile {
  id: string;
  email: string;
  discordUsername: string;
  discordGlobalName: string;
  name: string | null;
  role: string;
  description: string | null;
  background: string | null;
  githubProfileUrl: string | null;
  skills: string[];
  firstHeardAboutBitcoinOn: string | null;
  bitcoinBooksRead: string[];
  whyBitcoin: string | null;
  weeklyCohortCommitmentHours: number | null;
  location: string | null;
}



// Predefined options
const SKILLS_OPTIONS = [
  'JavaScript', 'TypeScript', 'Python', 'Rust', 'Go', 'C++', 'React', 'Node.js',
  'Bitcoin Core', 'Lightning Network', 'Cryptography', 'Backend Development',
  'Frontend Development', 'Smart Contracts', 'Security', 'DevOps'
];

const BITCOIN_BOOKS_OPTIONS = [
  'Mastering Bitcoin',
  'The Bitcoin Standard',
  'Programming Bitcoin',
  'Inventing Bitcoin',
  'The Blocksize War',
  'Layered Money',
  '21 Lessons',
  'Grokking Bitcoin',
  'The Book of Satoshi',
  'Bitcoin Money'
];

const StudentProfileData: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasMasteringBitcoin, setHasMasteringBitcoin] = useState(false);
  const [joinedCohorts, setJoinedCohorts] = useState<string[]>([]);
  const [joiningCohortId, setJoiningCohortId] = useState<string | null>(null);
  const [skillsDropdownOpen, setSkillsDropdownOpen] = useState(false);
  const [booksDropdownOpen, setBooksDropdownOpen] = useState(false);

  // Use hooks for data fetching
  const { data: userData, isLoading: isLoadingUser } = useUser();
  const { data: cohortsData } = useCohorts({ page: 0, limit: 100 });
  const { data: scoresData } = useMyScores();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();
  const { mutate: joinCohort } = useJoinCohort();

  // Set profile when userData loads
  useEffect(() => {
    if (userData) {
      console.log('userData changed, updating profile:', userData);
      setProfile(userData);
    }
  }, [userData]);

  // Set joined cohorts and mastering bitcoin status when scoresData loads
  useEffect(() => {
    if (scoresData) {
      const joinedCohortIds = scoresData.cohorts.map((record: any) => record.cohortId);
      
      setJoinedCohorts(joinedCohortIds);

      // Check if user has joined MASTERING_BITCOIN cohort
      const hasMB = scoresData.cohorts.some((record: any) => record.cohortType === 'MASTERING_BITCOIN');
      setHasMasteringBitcoin(hasMB);
    }
  }, [scoresData]);

  const cohorts = cohortsData?.records || [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (!profile) return;

    setProfile(prev => {
      if (!prev) return prev;

      if (name === 'weeklyCohortCommitmentHours') {
        return { ...prev, [name]: value ? parseInt(value) : null };
      }

      return { ...prev, [name]: value || null };
    });
  };

  const addSkill = (skill: string) => {
    if (!profile || profile.skills.includes(skill)) return;
    setProfile({ ...profile, skills: [...profile.skills, skill] });
    setSkillsDropdownOpen(false);
  };

  const removeSkill = (skill: string) => {
    if (!profile) return;
    setProfile({ ...profile, skills: profile.skills.filter(s => s !== skill) });
  };

  const addBook = (book: string) => {
    if (!profile || profile.bitcoinBooksRead.includes(book)) return;
    setProfile({ ...profile, bitcoinBooksRead: [...profile.bitcoinBooksRead, book] });
    setBooksDropdownOpen(false);
  };

  const removeBook = (book: string) => {
    if (!profile) return;
    setProfile({ ...profile, bitcoinBooksRead: profile.bitcoinBooksRead.filter(b => b !== book) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    console.log('Submitting profile update:', profile);

    
    updateUser(profile, {
      onSuccess: (data) => {
        console.log('Update successful, received data:', data);
        // Don't set profile here - let the query invalidation handle it
        alert('Profile updated successfully!');
      },
      onError: (error) => {
        console.error('Error updating profile:', error);
        alert('Error updating profile');
      }
    });
  };

  const handleJoinCohort = async (cohortId: string) => {
    setJoiningCohortId(cohortId);
    joinCohort({ cohortId }, {
      onSuccess: () => {
        alert('Successfully joined cohort!');
        setJoiningCohortId(null);
      },
      onError: (error) => {
        console.error('Error joining cohort:', error);
        alert('Error joining cohort');
        setJoiningCohortId(null);
      }
    });
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-white font-medium">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="text-white font-medium">Failed to load profile</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Mastering Bitcoin Access Bar */}
        {hasMasteringBitcoin && (
          <div className="bg-gradient-to-r from-orange-600 to-orange-700 border border-orange-500/50 rounded-xl p-4 mb-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className='flex flex-col gap-2'>
                  <p className="text-white font-semibold text-3xl">Mastering Bitcoin Cohort</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/mb-instructions')}
                className="bg-white text-orange-700 font-semibold px-6 py-2 rounded-lg hover:bg-orange-50 transition-colors duration-200 flex items-center space-x-2 border-none"
              >
                <span>View Instructions</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8 text-center lg:text-left">Profile Settings</h1>

        <form onSubmit={handleSubmit} className="bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-6 sm:p-8 mb-8 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-zinc-300 mb-3">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profile.name || ''}
                  onChange={handleInputChange}
                  className="w-96 px-4 py-3 bg-zinc-700/80 border border-zinc-600/50 rounded-xl text-white placeholder-zinc-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-zinc-300 mb-3">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profile.email}
                  disabled
                  className="w-96 px-4 py-3 bg-zinc-600/60 border border-zinc-600/30 rounded-xl text-zinc-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="discordUsername" className="block text-sm font-semibold text-zinc-300 mb-3">
                  Discord Username
                </label>
                <input
                  type="text"
                  id="discordUsername"
                  name="discordUsername"
                  value={profile.discordUsername}
                  disabled
                  className="w-96 px-4 py-3 bg-zinc-600/60 border border-zinc-600/30 rounded-xl text-zinc-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="discordGlobalName" className="block text-sm font-semibold text-zinc-300 mb-3">
                  Discord Display Name
                </label>
                <input
                  type="text"
                  id="discordGlobalName"
                  name="discordGlobalName"
                  value={profile.discordGlobalName}
                  disabled
                  className="w-96 px-4 py-3 bg-zinc-600/60 border border-zinc-600/30 rounded-xl text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-zinc-300 mb-3">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={profile.location || ''}
                  onChange={handleInputChange}
                  className="w-96 px-4 py-3 bg-zinc-700/80 border border-zinc-600/50 rounded-xl text-white placeholder-zinc-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="githubProfileUrl" className="block text-sm font-semibold text-zinc-300 mb-3">
                  GitHub Profile URL
                </label>
                <input
                  type="url"
                  id="githubProfileUrl"
                  name="githubProfileUrl"
                  value={profile.githubProfileUrl || ''}
                  onChange={handleInputChange}
                  className="w-96 px-4 py-3 bg-zinc-700/80 border border-zinc-600/50 rounded-xl text-white placeholder-zinc-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="weeklyCohortCommitmentHours" className="block text-sm font-semibold text-zinc-300 mb-3">
                  Weekly Cohort Commitment Hours
                </label>
                <input
                  type="number"
                  id="weeklyCohortCommitmentHours"
                  name="weeklyCohortCommitmentHours"
                  value={profile.weeklyCohortCommitmentHours || ''}
                  onChange={handleInputChange}
                  min="0"
                  className="w-96 px-4 py-3 bg-zinc-700/80 border border-zinc-600/50 rounded-xl text-white placeholder-zinc-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="firstHeardAboutBitcoinOn" className="block text-sm font-semibold text-zinc-300 mb-3">
                  First Heard About Bitcoin On
                </label>
                <input
                  type="text"
                  id="firstHeardAboutBitcoinOn"
                  name="firstHeardAboutBitcoinOn"
                  value={profile.firstHeardAboutBitcoinOn || ''}
                  onChange={handleInputChange}
                  className="w-96 px-4 py-3 bg-zinc-700/80 border border-zinc-600/50 rounded-xl text-white placeholder-zinc-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-8">
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-zinc-300 mb-3">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={profile.description || ''}
                onChange={handleInputChange}
                rows={3}
                className="w-[820px] px-4 py-3 bg-zinc-700/80 border border-zinc-600/50 rounded-xl text-white placeholder-zinc-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 resize-none"
              />
            </div>

            <div>
              <label htmlFor="background" className="block text-sm font-semibold text-zinc-300 mb-3">
                Background
              </label>
              <textarea
                id="background"
                name="background"
                value={profile.background || ''}
                onChange={handleInputChange}
                rows={3}
                className="w-[820px] px-4 py-3 bg-zinc-700/80 border border-zinc-600/50 rounded-xl text-white placeholder-zinc-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 resize-none"
              />
            </div>

            <div>
              <label htmlFor="whyBitcoin" className="block text-sm font-semibold text-zinc-300 mb-3">
                Why Bitcoin?
              </label>
              <textarea
                id="whyBitcoin"
                name="whyBitcoin"
                value={profile.whyBitcoin || ''}
                onChange={handleInputChange}
                rows={3}
                className="w-[820px] px-4 py-3 bg-zinc-700/80 border border-zinc-600/50 rounded-xl text-white placeholder-zinc-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-3">
                Skills
              </label>
              <div className="w-[820px]">
                {/* Selected Skills Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-orange-600 text-white rounded-lg text-sm flex items-center space-x-2"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="hover:text-orange-200 border-none bg-transparent"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSkillsDropdownOpen(!skillsDropdownOpen)}
                    className="w-full px-4 py-3 bg-zinc-700/80 border border-zinc-600/50 rounded-xl text-white text-left flex items-center justify-between hover:bg-zinc-700 transition-all"
                  >
                    <span>Add a skill...</span>
                    <span className="text-orange-400">{skillsDropdownOpen ? '▲' : '▼'}</span>
                  </button>

                  {skillsDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-zinc-700 border border-zinc-600 rounded-xl max-h-60 overflow-y-auto shadow-lg">
                      {SKILLS_OPTIONS.filter(s => !profile.skills.includes(s)).map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => addSkill(skill)}
                          className="w-full px-4 py-2 text-left text-white hover:bg-orange-600 transition-colors border-none"
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-3">
                Bitcoin Books Read
              </label>
              <div className="w-[820px]">
                {/* Selected Books Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {profile.bitcoinBooksRead.map((book) => (
                    <span
                      key={book}
                      className="px-3 py-1 bg-orange-600 text-white rounded-lg text-sm flex items-center space-x-2"
                    >
                      <span>{book}</span>
                      <button
                        type="button"
                        onClick={() => removeBook(book)}
                        className="hover:text-orange-200 border-none bg-transparent"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setBooksDropdownOpen(!booksDropdownOpen)}
                    className="w-full px-4 py-3 bg-zinc-700/80 border border-zinc-600/50 rounded-xl text-white text-left flex items-center justify-between hover:bg-zinc-700 transition-all"
                  >
                    <span>Add a book...</span>
                    <span className="text-orange-400">{booksDropdownOpen ? '▲' : '▼'}</span>
                  </button>

                  {booksDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-zinc-700 border border-zinc-600 rounded-xl max-h-60 overflow-y-auto shadow-lg">
                      {BITCOIN_BOOKS_OPTIONS.filter(b => !profile.bitcoinBooksRead.includes(b)).map((book) => (
                        <button
                          key={book}
                          type="button"
                          onClick={() => addBook(book)}
                          className="w-full px-4 py-2 text-left text-white hover:bg-orange-600 transition-colors border-none"
                        >
                          {book}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-800 focus:ring-2 focus:ring-orange-500/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100 border-none"
            >
              {isUpdating ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Updating...</span>
                </div>
              ) : (
                'Update Profile'
              )}
            </button>
          </div>
        </form>

        {/* Cohorts Section */}
        
        <div className="bg-zinc-800/80 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 text-center lg:text-left">Join a Cohort</h2>
          {cohorts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {cohorts.map((cohort) => {
                const isRegistrationOpen = new Date() < new Date(cohort.registrationDeadline);
                const isAlreadyJoined = joinedCohorts.includes(cohort.id);
                const cohortTitle = `${cohort.type.replace('_', ' ')} - Season ${cohort.season}`;

                let status = 'Registration Open';
                if (isAlreadyJoined) {
                  status = 'Already Joined';
                } else if (!isRegistrationOpen) {
                  status = 'Registration Closed';
                }

                return (
                  <div key={cohort.id} className="relative transform transition-all duration-300 hover:scale-[1.02]">
                    <CohortCard
                      title={cohortTitle}
                      students={cohort.weeks.length}
                      status={status}
                      onClick={isAlreadyJoined ? () => {} : () => { handleJoinCohort(cohort.id); }}
                    />
                    {joiningCohortId === cohort.id && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                        <div className="flex items-center space-x-3 text-white">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-medium">Joining...</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-zinc-400 text-center py-12 text-lg">
              No cohorts available at the moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProfileData;