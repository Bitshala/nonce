import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/userHooks';
import { UserRole } from '../types/enums';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const FloatingNavbar = () => {
  const navigate = useNavigate();

  const { data: user } = useUser();

  const handleBack = () => {
    navigate(-1);
  };

  const handleForward = () => {
    navigate(1);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };



  const adminNavItems: NavItem[] = [
    {
      label: 'Admin',
      path: '/admin',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      label: 'Select',
      path: '/select',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
  ];

  const taNavItems: NavItem[] = [
    {
      label: 'Admin',
      path: '/admin',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      label: 'Select',
      path: '/select',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
  ];

  const studentNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/myDashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: 'Profile',
      path: '/me',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      label: 'Feedback',
      path: '/cohortfeedback',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
    },
  ];

  const getNavItems = () => {
    if (user?.role === UserRole.ADMIN) return adminNavItems;
    if (user?.role === UserRole.TEACHING_ASSISTANT) return taNavItems;
    return studentNavItems;
  };

  const navItems = getNavItems();

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className=" backdrop-blur-md border border-zinc-700/50 rounded-2xl shadow-xl px-3 py-2 flex items-center gap-1 bg-orange-400 b-0">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="b-0 p-2 rounded-lg transition-all duration-200 group bg-white hover:bg-zinc-700"
          title="Go back"
        >
          <svg className="w-4 h-4 text-zinc-400 group-hover:text-zinc-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-700" />

        {/* Navigation items */}
        {navItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleNavigation(item.path)}
            className={`b-0 flex flex-col items-center justify-center px-3 py-1.5 rounded-lg transition-all duration-200 min-w-[60px] bg-white hover:text-white hover:bg-zinc-700`}
            title={item.label}
          >
            <div className="scale-90">
              {item.icon}
            </div>
            <span className="text-[10px] mt-0.5 font-medium">
              {item.label}
            </span>
          </button>
        ))}

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-700" />

        {/* Forward button */}
        <button
          onClick={handleForward}
          className="b-0 p-2 rounded-lg transition-all duration-200 group bg-white hover:bg-zinc-700"
          title="Go forward"
        >
          <svg className="w-4 h-4 text-zinc-400 group-hover:text-zinc-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FloatingNavbar;
