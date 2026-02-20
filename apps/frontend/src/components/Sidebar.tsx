import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  User,

  LogOut,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import { useUser } from '../hooks/userHooks';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/enums';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

const adminNavItems: NavItem[] = [
  { label: 'Cohorts', path: '/select', icon: GraduationCap },
];

const studentNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/myDashboard', icon: LayoutDashboard },
  { label: 'Profile', path: '/me', icon: User },
];

const instructionLinks = [
  { label: 'General', path: '/general-instructions' },
  { label: 'Mastering Bitcoin', path: '/mb-instructions' },
  { label: 'Learning Bitcoin CLI', path: '/lbtcl-instructions' },
  { label: 'Lightning Network', path: '/ln-instructions' },
  { label: 'Bitcoin Protocol Dev', path: '/bpd-instructions' },
];

const getInitial = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user } = useUser();
  const { logout } = useAuth();

  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('sidebar-collapsed', String(next));
    } catch {
      // ignore
    }
  };

  const navItems =
    user?.role === UserRole.ADMIN || user?.role === UserRole.TEACHING_ASSISTANT
      ? adminNavItems
      : studentNavItems;

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className="h-screen sticky top-0 flex flex-col bg-zinc-900 border-r border-zinc-800 transition-all duration-200"
      style={{ width: collapsed ? 64 : 240, minWidth: collapsed ? 64 : 240 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-zinc-800">
        {!collapsed && (
          <span className="text-base font-bold text-zinc-100 whitespace-nowrap">Bitshala</span>
        )}
        <button
          onClick={toggleCollapse}
          className="b-0 p-1.5 rounded-md bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={`b-0 w-full flex items-center gap-3 rounded-lg transition-all duration-150 ${
                collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'
              } ${
                active
                  ? 'bg-orange-500/10 text-orange-400 border-l-3 border-orange-500'
                  : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border-l-3 border-transparent'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              {!collapsed && (
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}

        {/* Instructions section */}
        <div className="mt-2 pt-2 border-t border-zinc-800/50">
          <button
            onClick={() => collapsed ? navigate('/general-instructions') : setInstructionsOpen(!instructionsOpen)}
            title={collapsed ? 'Instructions' : undefined}
            className={`b-0 w-full flex items-center gap-3 rounded-lg transition-all duration-150 ${
              collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'
            } ${
              instructionLinks.some((l) => isActive(l.path))
                ? 'bg-orange-500/10 text-orange-400'
                : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <BookOpen size={20} strokeWidth={instructionLinks.some((l) => isActive(l.path)) ? 2.2 : 1.8} />
            {!collapsed && (
              <>
                <span className="text-sm font-medium whitespace-nowrap flex-1 text-left">Instructions</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${instructionsOpen ? 'rotate-180' : ''}`}
                />
              </>
            )}
          </button>

          {!collapsed && instructionsOpen && (
            <div className="ml-5 mt-1 space-y-0.5 border-l border-zinc-700/50 pl-3">
              {instructionLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={`b-0 w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
                    isActive(link.path)
                      ? 'text-orange-400 bg-orange-500/10'
                      : 'text-zinc-500 hover:text-zinc-300 bg-transparent hover:bg-zinc-800/50'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom: user info + logout */}
      <div className="border-t border-zinc-800 px-2 py-3 space-y-1">
        {/* User info */}
        {user && (
          <button
            onClick={() => navigate('/myDashboard')}
            className={`b-0 w-full flex items-center gap-2.5 rounded-lg bg-transparent hover:bg-zinc-800/50 transition-colors duration-150 ${
              collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-zinc-300">
                {getInitial(user.name || user.discordUsername)}
              </span>
            </div>
            {!collapsed && (
              <div className="overflow-hidden text-left leading-tight">
                <p className="text-sm font-medium text-zinc-200 truncate">
                  {user.name || user.discordUsername}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">{user.role}</p>
              </div>
            )}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          title={collapsed ? 'Logout' : undefined}
          className={`b-0 w-full flex items-center gap-3 rounded-lg bg-transparent text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 ${
            collapsed ? 'justify-center px-0 py-3' : 'px-3 py-2.5'
          }`}
        >
          <LogOut size={20} strokeWidth={1.8} />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
