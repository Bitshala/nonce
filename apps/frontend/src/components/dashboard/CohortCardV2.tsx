import React from 'react';

interface CohortCardV2Props {
  cohortType: string;
  cohortDisplayName: string;
  imageUrl: string;
  status?: string;
  season?: number;
  isEnrolled?: boolean;
  registrationOpen?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  variant?: 'desktop' | 'mobile';
}

const CohortCardV2: React.FC<CohortCardV2Props> = ({
  cohortType,
  cohortDisplayName,
  imageUrl,
  status,
  season,
  isEnrolled,
  registrationOpen,
  isLoading = false,
  onClick,
  variant = 'desktop',
}) => {
  const getCursorStyle = () => {
    if (isLoading) return 'cursor-wait';
    return 'cursor-pointer';
  };

  const getStatusColor = () => {
    if (isEnrolled) return 'text-green-400';
    if (status === 'Active') return 'text-green-400';
    if (status === 'Upcoming') return 'text-blue-400';
    return 'text-zinc-400';
  };

  const getStatusText = () => {
    if (isEnrolled) return 'Enrolled';
    if (registrationOpen) return 'Join Cohort';
    if (status) return status;
    return 'Join Waitlist';
  };

  // Desktop Card
  if (variant === 'desktop') {
    return (
      <div
        className={`w-full rounded-2xl overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-lg ${getCursorStyle()} flex flex-col ${
          isLoading ? 'opacity-75' : ''
        }`}
        onClick={() => {
          if (!isLoading && onClick) {
            onClick();
          }
        }}
      >
        <div className="h-[180px] w-full">
          <img
            src={imageUrl}
            alt={cohortType}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="bg-black py-3 px-4">
          <h3 className="text-orange-400 font-semibold text-sm leading-tight mb-2">
            {cohortDisplayName}
          </h3>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            {season !== undefined && (
              <span className="text-zinc-400 text-xs">
                Season {season}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mobile Card
  return (
    <div
      className={`bg-zinc-800 rounded-2xl overflow-hidden ${getCursorStyle()} hover:bg-zinc-750 transition-colors ${
        isLoading ? 'opacity-75' : ''
      }`}
      onClick={() => {
        if (!isLoading && onClick) {
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-4 p-4 min-h-[104px]">
        {/* Image */}
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
          <img
            src={imageUrl}
            alt={cohortType}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="flex items-center justify-between flex-1 min-h-[80px]">
          <div className="flex-1 flex flex-col justify-center min-w-0 pr-2">
            <h3 className="text-base font-medium lowercase mb-1 leading-tight truncate w-64">
              {cohortDisplayName.toLowerCase()}
            </h3>
            <p className={`text-sm lowercase ${getStatusColor()}`}>
              {getStatusText().toLowerCase()}
            </p>
          </div>
          {season !== undefined && (
            <div className="text-right ml-3 flex-shrink-0">
              <p className="text-sm text-zinc-400 lowercase">season</p>
              <p className="text-lg font-semibold">{season}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CohortCardV2;
