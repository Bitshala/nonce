import LoadingSpinner from '../LoadingSpinner';

interface CohortCardProps {
  cohortId: string;
  cohortType: string;
  imageUrl: string;
  isLoading?: boolean;
  isEnrolled?: boolean;
  registrationOpen?: boolean;
  onClick?: () => void;
}

const CohortCard = ({
  cohortType,
  imageUrl,
  isLoading = false,
  isEnrolled = false,
  registrationOpen = false,
  onClick,
}: CohortCardProps) => {
  const getButtonText = () => {
    if (isEnrolled) return 'Enrolled';
    if (registrationOpen) return 'Join Cohort';
    return 'Join the waitlist';
  };

  const getCursorStyle = () => {
    if (isLoading) return 'cursor-wait';
    if (isEnrolled) return 'cursor-default';
    return 'cursor-pointer';
  };

  return (
    <div
      className={`h-[180px] w-[320px] rounded-sm overflow-hidden relative transform transition-all duration-300 ${getCursorStyle()} ${
        isLoading ? 'opacity-75' : isEnrolled ? '' : 'hover:scale-105 hover:shadow-lg'
      }`}
      onClick={() => {
        if (!isLoading && !isEnrolled && onClick) {
          onClick();
        }
      }}
    >
      <img src={imageUrl} alt={cohortType} className="w-full h-full object-contain" />
      <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
        {isLoading ? (
          <LoadingSpinner size="md" showText text="Loading..." className="text-white" />
        ) : (
          <span className="text-white font-semibold text-lg">{getButtonText()}</span>
        )}
      </div>
    </div>
  );
};

export default CohortCard;
