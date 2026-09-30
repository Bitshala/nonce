import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  Collapse,
  Divider,
  Tooltip,
  Popper,
  Paper,
} from '@mui/material';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import ChatBubbleOutlineOutlined from '@mui/icons-material/ChatBubbleOutlineOutlined';
import ChecklistOutlined from '@mui/icons-material/ChecklistOutlined';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import Login from '@mui/icons-material/Login';
import Logout from '@mui/icons-material/Logout';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import WorkspacePremiumOutlined from '@mui/icons-material/WorkspacePremiumOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import { useMyFellowships } from '../hooks/fellowshipHooks';
import { useUser } from '../hooks/userHooks';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '@nonce/shared';

interface NavItem {
  label: string;
  path: string;
  icon: SvgIconComponent;
}

const adminNavItems: NavItem[] = [
  { label: 'Cohorts', path: '/select', icon: SchoolOutlined },
  { label: 'Cohort Metrics', path: '/cohort-metrics', icon: BarChartOutlined },
  { label: 'Assignments', path: '/admin/assignments', icon: ChecklistOutlined },
  { label: 'Cohort Feedback', path: '/admin/feedback', icon: ChatBubbleOutlineOutlined },
];

// Profile is reached from the button on the dashboard header, not from here.
const studentNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/myDashboard', icon: DashboardOutlined },
  { label: 'Assignments', path: '/assignments', icon: ChecklistOutlined },
];

const instructionLinks = [
  { label: 'General', path: '/general-instructions' },
  { label: 'Mastering Bitcoin', path: '/mb-instructions' },
  { label: 'Learning Bitcoin CLI', path: '/lbtcl-instructions' },
  { label: 'Lightning Network', path: '/ln-instructions' },
  { label: 'Bitcoin Protocol Dev', path: '/bpd-instructions' },
  { label: 'Programming Bitcoin', path: '/pb-instructions' },
  { label: 'Building Bitcoin in Rust', path: '/bbr-instructions' },
];

// The apply form has no sidebar entry — it opens from the Apply button on
// the My Applications page.
const baseFellowshipStudentLinks: NavItem[] = [
  { label: 'My Applications', path: '/fellowship/applications', icon: AssignmentOutlined },
];

// Shown only once an application is approved (i.e. a fellowship exists).
const awardedFellowshipStudentLinks: NavItem[] = [
  { label: 'My Fellowships', path: '/fellowship/me', icon: WorkspacePremiumOutlined },
  { label: 'My Reports', path: '/fellowship/reports', icon: FactCheckOutlined },
];

const adminFellowshipLinks = [
  { label: 'Applications', path: '/admin/fellowships/applications', icon: DescriptionOutlined },
  { label: 'Manage', path: '/admin/fellowships', icon: WorkspacePremiumOutlined },
  { label: 'Reports', path: '/admin/fellowships/reports', icon: AssignmentOutlined },
];

// Admin-only top-level tools — TAs (who share the rest of the staff nav) don't see these.
const adminOnlyNavItems: NavItem[] = [
  { label: 'Users', path: '/admin/users', icon: GroupOutlined },
];

const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 68;

const getInitial = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

/**
 * Icon and label are always mounted, at the same offsets whether the rail is
 * open or not. Only the label fades, so nothing reflows while the width
 * animates.
 */
const NavLabel = ({
  icon,
  label,
  collapsed,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  trailing?: React.ReactNode;
}) => (
  <>
    <ListItemIcon sx={{ minWidth: 36, color: 'inherit', flexShrink: 0 }}>{icon}</ListItemIcon>
    <ListItemText
      primary={label}
      primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500, noWrap: true }}
      sx={{ m: 0, opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease' }}
    />
    {trailing && (
      <Box aria-hidden={collapsed || undefined} sx={{ display: 'flex', opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease' }}>{trailing}</Box>
    )}
  </>
);

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, isAuthenticated, openLogin } = useAuth();
  // Signed out these 401; the nav renders from static config regardless.
  const { data: user } = useUser(undefined, { enabled: isAuthenticated });

  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [instructionsHover, setInstructionsHover] = useState(false);
  const instructionsAnchorRef = useRef<HTMLDivElement>(null);
  const instructionsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fellowshipsOpen, setFellowshipsOpen] = useState(
    () =>
      location.pathname.startsWith('/fellowship') ||
      location.pathname.startsWith('/admin/fellowships'),
  );
  const [fellowshipsHover, setFellowshipsHover] = useState(false);
  const fellowshipsAnchorRef = useRef<HTMLDivElement>(null);
  const fellowshipsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const HOVER_CLOSE_DELAY = 150;

  const openFellowshipsHover = () => {
    if (fellowshipsCloseTimer.current) {
      clearTimeout(fellowshipsCloseTimer.current);
      fellowshipsCloseTimer.current = null;
    }
    setFellowshipsHover(true);
  };
  const closeFellowshipsHover = () => {
    if (fellowshipsCloseTimer.current) clearTimeout(fellowshipsCloseTimer.current);
    fellowshipsCloseTimer.current = setTimeout(
      () => setFellowshipsHover(false),
      HOVER_CLOSE_DELAY,
    );
  };

  const openInstructionsHover = () => {
    if (instructionsCloseTimer.current) {
      clearTimeout(instructionsCloseTimer.current);
      instructionsCloseTimer.current = null;
    }
    setInstructionsHover(true);
  };
  const closeInstructionsHover = () => {
    if (instructionsCloseTimer.current) clearTimeout(instructionsCloseTimer.current);
    instructionsCloseTimer.current = setTimeout(
      () => setInstructionsHover(false),
      HOVER_CLOSE_DELAY,
    );
  };

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

  const isStaff =
    user?.role === UserRole.ADMIN || user?.role === UserRole.TEACHING_ASSISTANT;
  // The fellowship admin tools (Applications / Manage / Reports) are admin-only.
  // TAs keep the rest of the staff nav (Cohorts, Cohort Metrics) but don't see
  // the fellowship "Admin" link group below.
  const isAdmin = user?.role === UserRole.ADMIN;
  const navItems = isStaff
    ? [...adminNavItems, ...(isAdmin ? adminOnlyNavItems : [])]
    : studentNavItems;

  // My Fellowships / My Reports only make sense once an application has been
  // approved — approval is what creates the user's first fellowship.
  const myFellowshipsQuery = useMyFellowships({ page: 0, pageSize: 1 }, { enabled: isAuthenticated });
  const hasFellowship = (myFellowshipsQuery.data?.totalRecords ?? 0) > 0;
  const fellowshipStudentLinks = hasFellowship
    ? [...baseFellowshipStudentLinks, ...awardedFellowshipStudentLinks]
    : baseFellowshipStudentLinks;

  const isActive = (path: string) => location.pathname === path;

  // The apply form opens from the My Applications page (it has no sidebar
  // entry of its own), so it keeps that link highlighted.
  const isStudentLinkActive = (path: string) =>
    isActive(path) ||
    (path === '/fellowship/applications' &&
      (location.pathname === '/fellowship' ||
        location.pathname.startsWith('/fellowship/apply')));

  const fellowshipsSectionActive =
    location.pathname.startsWith('/fellowship') ||
    location.pathname.startsWith('/admin/fellowships');

  const drawerWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  const activeItemSx = {
    bgcolor: 'rgba(249,115,22,0.08)',
    color: '#fb923c',
    '&:hover': { bgcolor: 'rgba(249,115,22,0.12)' },
  };

  const inactiveItemSx = {
    color: '#a1a1aa',
    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', color: '#e4e4e7' },
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          bgcolor: '#0f0f0f',
          borderRight: '1px solid #27272a',
          transition: 'width 200ms ease',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          height: 64,
          borderBottom: '1px solid #27272a',
          flexShrink: 0,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: '#fafafa',
            fontSize: '1.1rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            maxWidth: collapsed ? 0 : 160,
            opacity: collapsed ? 0 : 1,
            transition: 'opacity 150ms ease, max-width 200ms ease',
          }}
        >
          Bitshala
        </Typography>
        <IconButton onClick={toggleCollapse} size="small" sx={{ color: '#71717a', '&:hover': { color: '#d4d4d8', bgcolor: '#27272a' } }}>
          {collapsed ? <ChevronRight sx={{ fontSize: 18 }} /> : <ChevronLeft sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, py: 1.5, px: 1, overflowY: 'auto' }}>
        <List disablePadding>
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right" arrow>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.5,
                    py: 1.25,
                    px: 2,
                    minHeight: 44,
                    ...(active ? activeItemSx : inactiveItemSx),
                  }}
                >
                  <NavLabel
                    icon={<Icon sx={{ fontSize: 20 }} />}
                    label={item.label}
                    collapsed={collapsed}
                  />
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>

        <Divider sx={{ borderColor: '#27272a', my: 1.5 }} />

        <List disablePadding>
          <Box
            ref={fellowshipsAnchorRef}
            onMouseEnter={() => collapsed && openFellowshipsHover()}
            onMouseLeave={() => collapsed && closeFellowshipsHover()}
          >
            <ListItemButton
              onClick={() =>
                collapsed
                  ? navigate('/fellowship/applications')
                  : setFellowshipsOpen((o) => !o)
              }
              sx={{
                borderRadius: 1.5,
                py: 1.25,
                px: 2,
                minHeight: 44,
                ...(fellowshipsSectionActive ? activeItemSx : inactiveItemSx),
              }}
            >
              <NavLabel
                icon={<WorkspacePremiumOutlined sx={{ fontSize: 20 }} />}
                label="Fellowships"
                collapsed={collapsed}
                trailing={fellowshipsOpen ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
              />
            </ListItemButton>
          </Box>

          {collapsed && (
            <Popper
              open={fellowshipsHover}
              anchorEl={fellowshipsAnchorRef.current}
              placement="right-start"
              sx={{ zIndex: 1300 }}
            >
              <Paper
                onMouseEnter={openFellowshipsHover}
                onMouseLeave={closeFellowshipsHover}
                sx={{
                  bgcolor: '#1c1c1f',
                  border: '1px solid #27272a',
                  borderRadius: 1.5,
                  py: 0.5,
                  ml: 0,
                  minWidth: 200,
                }}
              >
                {fellowshipStudentLinks.map((link) => {
                  const active = isStudentLinkActive(link.path);
                  const Icon = link.icon;
                  return (
                    <ListItemButton
                      key={link.path}
                      onClick={() => {
                        navigate(link.path);
                        setFellowshipsHover(false);
                      }}
                      sx={{
                        py: 0.75,
                        px: 2,
                        gap: 1,
                        ...(active
                          ? { color: '#fb923c', bgcolor: 'rgba(249,115,22,0.08)', '&:hover': { bgcolor: 'rgba(249,115,22,0.12)' } }
                          : { color: '#a1a1aa', '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.04)' } }),
                      }}
                    >
                      <Icon sx={{ fontSize: 15 }} />
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                        {link.label}
                      </Typography>
                    </ListItemButton>
                  );
                })}
                {isAdmin && (
                  <>
                    <Divider sx={{ borderColor: '#27272a', my: 0.5 }} />
                    <Typography
                      sx={{
                        px: 2,
                        pt: 0.5,
                        pb: 0.25,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#52525b',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                      }}
                    >
                      Admin
                    </Typography>
                    {adminFellowshipLinks.map((link) => {
                      const active = isActive(link.path);
                      const Icon = link.icon;
                      return (
                        <ListItemButton
                          key={link.path}
                          onClick={() => {
                            navigate(link.path);
                            setFellowshipsHover(false);
                          }}
                          sx={{
                            py: 0.75,
                            px: 2,
                            gap: 1,
                            ...(active
                              ? { color: '#fb923c', bgcolor: 'rgba(249,115,22,0.08)', '&:hover': { bgcolor: 'rgba(249,115,22,0.12)' } }
                              : { color: '#a1a1aa', '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.04)' } }),
                          }}
                        >
                          <Icon sx={{ fontSize: 15 }} />
                          <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                            {link.label}
                          </Typography>
                        </ListItemButton>
                      );
                    })}
                  </>
                )}
              </Paper>
            </Popper>
          )}

          {!collapsed && (
            <Collapse in={fellowshipsOpen} timeout="auto" unmountOnExit>
              <List
                disablePadding
                sx={{ pl: 2.5, borderLeft: '1px solid #3f3f46', ml: 3, mt: 0.5 }}
              >
                {fellowshipStudentLinks.map((link) => {
                  const active = isStudentLinkActive(link.path);
                  return (
                    <ListItemButton
                      key={link.path}
                      onClick={() => navigate(link.path)}
                      sx={{
                        borderRadius: 1,
                        py: 1,
                        px: 1.5,
                        mb: 0.25,
                        ...(active
                          ? { color: '#fb923c', bgcolor: 'rgba(249,115,22,0.1)', '&:hover': { bgcolor: 'rgba(249,115,22,0.15)' } }
                          : { color: '#a1a1aa', '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.04)' } }),
                      }}
                    >
                      <ListItemText
                        primary={link.label}
                        primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                      />
                    </ListItemButton>
                  );
                })}
                {isAdmin && (
                  <>
                    <Typography
                      sx={{
                        px: 1.5,
                        pt: 1,
                        pb: 0.25,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#52525b',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                      }}
                    >
                      Admin
                    </Typography>
                    {adminFellowshipLinks.map((link) => {
                      const active = isActive(link.path);
                      return (
                        <ListItemButton
                          key={link.path}
                          onClick={() => navigate(link.path)}
                          sx={{
                            borderRadius: 1,
                            py: 1,
                            px: 1.5,
                            mb: 0.25,
                            ...(active
                              ? { color: '#fb923c', bgcolor: 'rgba(249,115,22,0.1)', '&:hover': { bgcolor: 'rgba(249,115,22,0.15)' } }
                              : { color: '#a1a1aa', '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.04)' } }),
                          }}
                        >
                          <ListItemText
                            primary={link.label}
                            primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </>
                )}
              </List>
            </Collapse>
          )}
        </List>

        <Divider sx={{ borderColor: '#27272a', my: 1.5 }} />

        {/* Instructions Section */}
        <List disablePadding>
          <Box
            ref={instructionsAnchorRef}
            onMouseEnter={() => collapsed && openInstructionsHover()}
            onMouseLeave={() => collapsed && closeInstructionsHover()}
          >
            <ListItemButton
              onClick={() => collapsed ? navigate('/general-instructions') : setInstructionsOpen(!instructionsOpen)}
              sx={{
                borderRadius: 1.5,
                py: 1.25,
                px: 2,
                minHeight: 44,
                ...(instructionLinks.some(l => isActive(l.path)) ? activeItemSx : inactiveItemSx),
              }}
            >
              <NavLabel
                icon={<MenuBookOutlined sx={{ fontSize: 20 }} />}
                label="Instructions"
                collapsed={collapsed}
                trailing={instructionsOpen ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
              />
            </ListItemButton>
          </Box>

          {/* Collapsed hover flyout */}
          {collapsed && (
            <Popper
              open={instructionsHover}
              anchorEl={instructionsAnchorRef.current}
              placement="right-start"
              sx={{ zIndex: 1300 }}
            >
              <Paper
                onMouseEnter={openInstructionsHover}
                onMouseLeave={closeInstructionsHover}
                sx={{
                  bgcolor: '#1c1c1f',
                  border: '1px solid #27272a',
                  borderRadius: 1.5,
                  py: 0.5,
                  ml: 0,
                  minWidth: 180,
                }}
              >
                {instructionLinks.map((link) => {
                  const active = isActive(link.path);
                  return (
                    <ListItemButton
                      key={link.path}
                      onClick={() => { navigate(link.path); setInstructionsHover(false); }}
                      sx={{
                        py: 0.75,
                        px: 2,
                        ...(active
                          ? { color: '#fb923c', bgcolor: 'rgba(249,115,22,0.08)', '&:hover': { bgcolor: 'rgba(249,115,22,0.12)' } }
                          : { color: '#a1a1aa', '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.04)' } }),
                      }}
                    >
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                        {link.label}
                      </Typography>
                    </ListItemButton>
                  );
                })}
              </Paper>
            </Popper>
          )}

          {!collapsed && (
            <Collapse in={instructionsOpen} timeout="auto" unmountOnExit>
              <List disablePadding sx={{ pl: 2.5, borderLeft: '1px solid #3f3f46', ml: 3, mt: 0.5 }}>
                {instructionLinks.map((link) => {
                  const active = isActive(link.path);
                  return (
                    <ListItemButton
                      key={link.path}
                      onClick={() => navigate(link.path)}
                      sx={{
                        borderRadius: 1,
                        py: 1,
                        px: 1.5,
                        mb: 0.25,
                        ...(active
                          ? { color: '#fb923c', bgcolor: 'rgba(249,115,22,0.1)', '&:hover': { bgcolor: 'rgba(249,115,22,0.15)' } }
                          : { color: '#a1a1aa', '&:hover': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.04)' } }),
                      }}
                    >
                      <ListItemText
                        primary={link.label}
                        primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: 500 }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Collapse>
          )}
        </List>
      </Box>

      {/* Bottom: User info + Logout */}
      <Box sx={{ borderTop: '1px solid #27272a', px: 1, py: 1.5, flexShrink: 0 }}>
        {/* User Info */}
        {user && (
          <Tooltip title={collapsed ? (user.name || user.discordUsername || '') : ''} placement="right" arrow>
            <ListItemButton
              onClick={() => navigate('/myDashboard')}
              sx={{
                borderRadius: 1.5,
                py: 1,
                px: '10px',
                color: '#d4d4d8',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                mb: 0.5,
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#3f3f46',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#d4d4d8',
                  mr: 1.5,
                  flexShrink: 0,
                }}
              >
                {getInitial(user.name || user.discordUsername)}
              </Avatar>
              <Box sx={{ overflow: 'hidden', opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease' }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: '#e4e4e7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {user.name || user.discordUsername}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: '#71717a', fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
                  >
                    {user.role}
                  </Typography>
              </Box>
            </ListItemButton>
          </Tooltip>
        )}

        {/* Sign in / Logout */}
        <Tooltip title={collapsed ? (isAuthenticated ? 'Logout' : 'Sign in') : ''} placement="right" arrow>
          <ListItemButton
            onClick={isAuthenticated ? logout : openLogin}
            sx={{
              borderRadius: 1.5,
              py: 1,
              px: 2,
              color: isAuthenticated ? '#a1a1aa' : '#fb923c',
              '&:hover': isAuthenticated
                ? { color: '#ef4444', bgcolor: 'rgba(239,68,68,0.1)' }
                : { color: '#fdba74', bgcolor: 'rgba(249,115,22,0.1)' },
            }}
          >
            <NavLabel
              icon={isAuthenticated ? <Logout sx={{ fontSize: 20 }} /> : <Login sx={{ fontSize: 20 }} />}
              label={isAuthenticated ? 'Logout' : 'Sign in'}
              collapsed={collapsed}
            />
          </ListItemButton>
        </Tooltip>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
