import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser, useUpdateUser } from '../../hooks/userHooks';

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
  "No skills",
  "Full-stack",
  "Front-end",
  "Back-end",
  "Dev ops",
  "UI/UX design",
  "Prompt engineering",
  "Rust",
  "Python",
  "C++",
  "Golang",
  "Graphic Design",
  "Video Editing",
  "Product Management",
  "Accounting",
  "Law",
  "Sales",
  "Business Operations",
  "Others"
];

const BITCOIN_BOOKS_OPTIONS = [
  "Haven't read any",
  "Mastering Bitcoin",
  "Mastering Lightning Network",
  "BPD",
  "LPD",
  "Learning Bitcoin through Command Line",
  "Programming Bitcoin",
  "The Bitcoin Standard",
  "Sovereign Individual",
  "The Broken Money",
  "The Blocksize War",
  "Others"
];

const StudentProfileData: React.FC = () => {
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skillsDropdownOpen, setSkillsDropdownOpen] = useState(false);
  const [booksDropdownOpen, setBooksDropdownOpen] = useState(false);
  const [showEmailPopup, setShowEmailPopup] = useState(false);

  // Use hooks for data fetching
  const { data: userData, isLoading: isLoadingUser } = useUser();
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser();

  // Set profile when userData loads
  useEffect(() => {
    if (userData) {
      console.log('userData changed, updating profile:', userData);
      setProfile(userData);
    }
  }, [userData]);

  // Check for navigation state to show email popup
  useEffect(() => {
    if (location.state?.showEmailPopup) {
      setShowEmailPopup(true);
    }
  }, [location]);

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

    // Validate that at least one skill is selected
    if (profile.skills.length === 0) {
      alert('Please select at least one skill');
      return;
    }

    // Validate that at least one book is selected
    if (profile.bitcoinBooksRead.length === 0) {
      alert('Please select at least one book/resource');
      return;
    }

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
    <div className="min-h-screen from-zinc-900 via-zinc-800 to-zinc-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8 text-center lg:text-left">Profile Settings</h1>

        <form onSubmit={handleSubmit} >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-zinc-300 mb-3">
                  Preferred Name*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profile.name || ''}
                  onChange={handleInputChange}
                  required
                  className="outline-none border-0 w-full px-4 py-3 bg-zinc-700/80 rounded-xl text-white placeholder-zinc-400 transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-zinc-300 mb-3">
                  Email*
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={profile.email || ''}
                  onChange={handleInputChange}
                  required
                  className="outline-none border-0 w-full px-4 py-3 bg-zinc-700/80 rounded-xl text-white placeholder-zinc-400 transition-all duration-200"
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
                  className="outline-none border-0 w-full px-4 py-3 bg-zinc-600/60 rounded-xl text-zinc-400 cursor-not-allowed"
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
                  className="outline-none border-0 w-full px-4 py-3 bg-zinc-600/60 rounded-xl text-zinc-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-zinc-300 mb-3 whitespace-nowrap">
                  Location*
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={profile.location || ''}
                  onChange={handleInputChange}
                  required
                  className="outline-none border-0 w-full px-4 py-3 bg-zinc-700/80 rounded-xl text-white placeholder-zinc-400 transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="githubProfileUrl" className="block text-sm font-semibold text-zinc-300 mb-3 whitespace-nowrap">
                  Portfolio/Github/Side-project link:*
                </label>
                <input
                  type="url"
                  id="githubProfileUrl"
                  name="githubProfileUrl"
                  value={profile.githubProfileUrl || ''}
                  onChange={handleInputChange}
                  required
                  className="outline-none border-0 w-full px-4 py-3 bg-zinc-700/80 rounded-xl text-white placeholder-zinc-400 transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="weeklyCohortCommitmentHours" className="block text-sm font-semibold text-zinc-300 mb-3 whitespace-nowrap">
                  hours per week willing to dedicate to this cohort?*
                </label>
                <input
                  type="number"
                  id="weeklyCohortCommitmentHours"
                  name="weeklyCohortCommitmentHours"
                  value={profile.weeklyCohortCommitmentHours || ''}
                  onChange={handleInputChange}
                  min="0"
                  required
                  className="outline-none border-0 w-full px-4 py-3 bg-zinc-700/80 rounded-xl text-white placeholder-zinc-400 transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="firstHeardAboutBitcoinOn" className="block text-sm font-semibold text-zinc-300 mb-3 whitespace-nowrap">
                  Which year did you start taking Bitcoin seriously?*
                </label>
                <input
                  type="text"
                  id="firstHeardAboutBitcoinOn"
                  name="firstHeardAboutBitcoinOn"
                  value={profile.firstHeardAboutBitcoinOn || ''}
                  onChange={handleInputChange}
                  required
                  className="outline-none border-0 w-full px-4 py-3 bg-zinc-700/80 rounded-xl text-white placeholder-zinc-400 transition-all duration-200"
                />
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-6">
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-zinc-300 mb-3">
                How would you describe yourself?*
              </label>
              <textarea
                id="description"
                name="description"
                value={profile.description || ''}
                onChange={handleInputChange}
                rows={3}
                required
                className="outline-none border-0 w-full px-4 py-3 bg-zinc-700/80 rounded-xl text-white placeholder-zinc-400 transition-all duration-200 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <label htmlFor="background" className="block text-sm font-semibold text-zinc-300 mb-3">
                  Why is Bitcoin important to you?*
                </label>
                <textarea
                  id="background"
                  name="background"
                  value={profile.background || ''}
                  onChange={handleInputChange}
                  rows={3}
                  required
                  className="outline-none border-0 w-full px-4 py-3 bg-zinc-700/80 rounded-xl text-white placeholder-zinc-400 transition-all duration-200 resize-none"
                />
              </div>

              <div>
                <label htmlFor="whyBitcoin" className="block text-sm font-semibold text-zinc-300 mb-3">
                  What do you hope to achieve through this Cohort?*
                </label>
                <textarea
                  id="whyBitcoin"
                  name="whyBitcoin"
                  value={profile.whyBitcoin || ''}
                  onChange={handleInputChange}
                  rows={3}
                  required
                  className="outline-none border-0 w-full px-4 py-3 bg-zinc-700/80 rounded-xl text-white placeholder-zinc-400 transition-all duration-200 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-3">
                  Please select list of skills*
                </label>
                <div className="w-full">
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
                      className="outline-none border-0 w-full px-4 py-3 bg-zinc-700/80 rounded-xl text-white text-left flex items-center justify-between hover:bg-zinc-700 transition-all"
                    >
                      <span>Add a skill...</span>
                      <span className="text-orange-400">{skillsDropdownOpen ? '▼' : '▲'}</span>
                    </button>

                    {skillsDropdownOpen && (
                      <div className="absolute z-10 w-full bottom-full mb-2 bg-zinc-800 border-0 rounded-xl max-h-60 overflow-y-auto shadow-lg">
                        {SKILLS_OPTIONS.filter(s => !profile.skills.includes(s)).map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => addSkill(skill)}
                            className="outline-none border-0 w-full px-4 py-2 text-left text-white bg-zinc-800 hover:bg-orange-600 transition-colors"
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
                  select books that you have gone through?*
                </label>
                <div className="w-full">
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
                      className="outline-none border-0 w-full px-4 py-3 bg-zinc-700/80 rounded-xl text-white text-left flex items-center justify-between hover:bg-zinc-700 transition-all"
                    >
                      <span>Add a book...</span>
                      <span className="text-orange-400">{booksDropdownOpen ? '▼' : '▲'}</span>
                    </button>

                    {booksDropdownOpen && (
                      <div className="absolute z-10 w-full bottom-full mb-2 bg-zinc-800 border-0 rounded-xl max-h-60 overflow-y-auto shadow-lg">
                        {BITCOIN_BOOKS_OPTIONS.filter(b => !profile.bitcoinBooksRead.includes(b)).map((book) => (
                          <button
                            key={book}
                            type="button"
                            onClick={() => addBook(book)}
                            className="outline-none border-0 w-full px-4 py-2 text-left text-white bg-zinc-800 hover:bg-orange-600 transition-colors"
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
      </div>

      {/* Email Required Popup */}
      {showEmailPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-zinc-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-zinc-100 mb-2">
                Information Required
              </h3>
              <p className="text-zinc-300 mb-6">Please fill in your profile information to join a cohort</p>
              <button
                onClick={() => setShowEmailPopup(false)}
                className="border-none bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-semibold px-8 py-3 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfileData;