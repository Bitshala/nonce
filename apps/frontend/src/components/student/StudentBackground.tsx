import type { StudentBackground as StudentBackgroundType } from '../../types/student';

interface StudentBackgroundProps {
  background: StudentBackgroundType;
}

export const StudentBackground = ({ background }: StudentBackgroundProps) => {
  const renderSkills = (skills: string) => {
    return skills.split(',').map((skill, index) => (
      <span 
        key={index} 
        className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-zinc-700 text-zinc-300"
      >
        {skill.trim()}
      </span>
    ));
  };

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-4">
        {background.describe_yourself && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              About Me
            </h3>
            <p className="text-sm text-zinc-300">{background.describe_yourself}</p>
          </div>
        )}
        
        {background.background && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Background
            </h3>
            <p className="text-sm text-zinc-300">{background.background}</p>
          </div>
        )}
        
        {background.location && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Location
            </h3>
            <p className="text-sm text-zinc-300">{background.location}</p>
          </div>
        )}
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        {background.skills && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Technical Skills
            </h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {renderSkills(background.skills)}
            </div>
          </div>
        )}
        
        {background.why && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Motivation
            </h3>
            <p className="text-sm text-zinc-300">{background.why}</p>
          </div>
        )}
        
        {background.year && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Year
            </h3>
            <p className="text-sm text-zinc-300">{background.year}</p>
          </div>
        )}
        
        {background.book && (
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              Book
            </h3>
            <p className="text-sm text-zinc-300">{background.book}</p>
          </div>
        )}
      </div>
    </div>
  );
};