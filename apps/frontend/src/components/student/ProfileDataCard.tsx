import { User, MapPin, Github, Book, Clock, MessageSquare } from 'lucide-react';

interface ProfileData {
  id?: string;
  email?: string;
  discordUsername?: string;
  discordGlobalName?: string;
  name?: string;
  role?: string;
  description?: string;
  background?: string;
  githubProfileUrl?: string;
  skills?: string[];
  firstHeardAboutBitcoinOn?: string;
  bitcoinBooksRead?: string[];
  whyBitcoin?: string;
  weeklyCohortCommitmentHours?: number;
  location?: string;
  referral?: string;
}

interface ProfileDataCardProps {
  profile: ProfileData;
}

export const ProfileDataCard = ({ profile }: ProfileDataCardProps) => {
  return (
    <div className="bg-zinc-900 border border-orange-300 font-mono rounded-lg overflow-hidden mt-8">
      {/* Header */}
      <div className="bg-zinc-700 px-4 py-3 flex items-center border-b border-orange-300">
        <User className="h-5 w-5 mr-2 text-orange-400" />
        <span className="text-orange-300 font-semibold">Profile Data</span>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProfileRow label="Email" value={profile.email} />
          <ProfileRow label="Discord Username" value={profile.discordUsername} />
          <ProfileRow label="Discord Name" value={profile.discordGlobalName} />
          <ProfileRow label="Role" value={profile.role} />
          {profile.location && (
            <ProfileRow label="Location" value={profile.location} icon={<MapPin className="h-4 w-4" />} />
          )}
          {profile.weeklyCohortCommitmentHours && (
            <ProfileRow
              label="Weekly Commitment"
              value={`${profile.weeklyCohortCommitmentHours} hours`}
              icon={<Clock className="h-4 w-4" />}
            />
          )}
        </div>

        {/* GitHub */}
        {profile.githubProfileUrl && (
          <div className="pt-4 border-t border-zinc-700">
            <div className="flex items-center space-x-2 text-orange-400 mb-2">
              <Github className="h-4 w-4" />
              <span className="font-semibold">GitHub</span>
            </div>
            <a
              href={profile.githubProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline text-sm"
            >
              {profile.githubProfileUrl}
            </a>
          </div>
        )}

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="pt-4 border-t border-zinc-700">
            <div className="text-orange-400 font-semibold mb-2">Skills</div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-zinc-700 text-orange-300 text-sm border border-orange-400"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bitcoin Books Read */}
        {profile.bitcoinBooksRead && profile.bitcoinBooksRead.length > 0 && (
          <div className="pt-4 border-t border-zinc-700">
            <div className="flex items-center space-x-2 text-orange-400 mb-2">
              <Book className="h-4 w-4" />
              <span className="font-semibold">Bitcoin Books Read</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.bitcoinBooksRead.map((book, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-zinc-700 text-orange-300 text-sm border border-orange-400"
                >
                  {book}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description & Background */}
        {(profile.description || profile.background) && (
          <div className="pt-4 border-t border-zinc-700 space-y-4">
            {profile.description && (
              <div>
                <div className="text-orange-400 font-semibold mb-2">Description</div>
                <p className="text-zinc-300 text-sm">{profile.description}</p>
              </div>
            )}
            {profile.background && (
              <div>
                <div className="text-orange-400 font-semibold mb-2">Background</div>
                <p className="text-zinc-300 text-sm">{profile.background}</p>
              </div>
            )}
          </div>
        )}

        {/* Why Bitcoin */}
        {profile.whyBitcoin && (
          <div className="pt-4 border-t border-zinc-700">
            <div className="flex items-center space-x-2 text-orange-400 mb-2">
              <MessageSquare className="h-4 w-4" />
              <span className="font-semibold">Why Bitcoin?</span>
            </div>
            <p className="text-zinc-300 text-sm">{profile.whyBitcoin}</p>
          </div>
        )}

        {/* Additional Info */}
        <div className="pt-4 border-t border-zinc-700 grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.firstHeardAboutBitcoinOn && (
            <ProfileRow label="First Heard About Bitcoin" value={profile.firstHeardAboutBitcoinOn} />
          )}
          {profile.referral && (
            <ProfileRow label="Referral" value={profile.referral} />
          )}
        </div>
      </div>
    </div>
  );
};

const ProfileRow = ({
  label,
  value,
  icon
}: {
  label: string;
  value?: string;
  icon?: React.ReactNode;
}) => {
  if (!value) return null;

  return (
    <div className="flex flex-col space-y-1">
      <span className="text-orange-400 text-xs font-semibold flex items-center space-x-1">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </span>
      <span className="text-zinc-300 text-sm">{value}</span>
    </div>
  );
};
