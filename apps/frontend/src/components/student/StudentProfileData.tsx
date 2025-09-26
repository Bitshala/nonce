import React, { useState, useEffect, useCallback } from 'react';
import CohortCard from '../CohortCard';
import apiClient from '../../services/api';

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

interface Cohort {
  id: string;
  type: string;
  season: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  weeks: Array<{
    id: string;
    week: number;
    questions: string[];
    bonusQuestion: string[];
    classroomUrl: string;
    classroomInviteLink: string;
  }>;
}


const StudentProfileData: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isJoining, setIsJoining] = useState<string | null>(null);

 

  const fetchProfileData = useCallback(async () => {
    try {
      const response = await apiClient.get('/users/me');

      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCohorts = useCallback(async () => {
    try {
      const response = await apiClient.get('/cohorts');
      console.log(response);
      setCohorts(response.data.records);
    } catch (error) {
      console.error('Error fetching cohorts:', error);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
    fetchCohorts();
  }, [fetchProfileData, fetchCohorts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (!profile) return;

    setProfile(prev => {
      if (!prev) return prev;

      if (name === 'skills') {
        return { ...prev, skills: value.split(',').map(s => s.trim()).filter(s => s) };
      }

      if (name === 'bitcoinBooksRead') {
        return { ...prev, bitcoinBooksRead: value.split(',').map(s => s.trim()).filter(s => s) };
      }

      if (name === 'weeklyCohortCommitmentHours') {
        return { ...prev, [name]: value ? parseInt(value) : null };
      }

      return { ...prev, [name]: value || null };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsUpdating(true);
    try {
      // Prepare the update payload with only the fields the backend supports
      const updatePayload = {
        name: profile.name,
        description: profile.description,
        background: profile.background,
        githubProfileUrl: profile.githubProfileUrl,
        skills: profile.skills,
        firstHeardAboutBitcoinOn: profile.firstHeardAboutBitcoinOn,
        bitcoinBooksRead: profile.bitcoinBooksRead,
        whyBitcoin: profile.whyBitcoin,
        weeklyCohortCommitmentHours: profile.weeklyCohortCommitmentHours,
        location: profile.location
      };

      console.log('Sending update payload:', updatePayload);

      const response = await apiClient.patch('/users/me', updatePayload);
      console.log('Received updated data:', response.data);
      setProfile(response.data);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleJoinCohort = async (cohortId: string) => {
    setIsJoining(cohortId);
    try {
      await apiClient.post(`/cohorts/${cohortId}/join`);
      alert('Successfully joined cohort!');
      fetchCohorts();
    } catch (error) {
      console.error('Error joining cohort:', error);
      alert('Error joining cohort');
    } finally {
      setIsJoining(null);
    }
  };

  if (isLoading) {
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
              <label htmlFor="skills" className="block text-sm font-semibold text-zinc-300 mb-3">
                Skills (comma-separated)
              </label>
              <input
                type="text"
                id="skills"
                name="skills"
                value={profile.skills.join(', ')}
                onChange={handleInputChange}
                className="w-[820px] px-4 py-3 bg-zinc-700/80 border border-zinc-600/50 rounded-xl text-white placeholder-zinc-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="bitcoinBooksRead" className="block text-sm font-semibold text-zinc-300 mb-3">
                Bitcoin Books Read (comma-separated)
              </label>
              <input
                type="text"
                id="bitcoinBooksRead"
                name="bitcoinBooksRead"
                value={profile.bitcoinBooksRead.join(', ')}
                onChange={handleInputChange}
                className="w-[820px] px-4 py-3 bg-zinc-700/80 border border-zinc-600/50 rounded-xl text-white placeholder-zinc-400 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="px-8 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-semibold rounded-xl hover:from-orange-700 hover:to-orange-800 focus:ring-2 focus:ring-orange-500/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100"
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
                const cohortTitle = `${cohort.type.replace('_', ' ')} - Season ${cohort.season}`;
                const status = isRegistrationOpen ? 'Registration Open' : 'Registration Closed';

                return (
                  <div key={cohort.id} className="relative transform transition-all duration-300 hover:scale-[1.02]">
                    <CohortCard
                      title={cohortTitle}
                      students={cohort.weeks.length}
                      status={status}
                      onClick={() => handleJoinCohort(cohort.id)}
                    />
                    {isJoining === cohort.id && (
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