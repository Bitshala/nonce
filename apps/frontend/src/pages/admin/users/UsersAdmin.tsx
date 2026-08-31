import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, MapPin, Search } from 'lucide-react';

import FellowshipPageLayout from '../../../components/fellowship/FellowshipPageLayout';
import { fontFamilyMono } from '../../../components/fellowship/theme';
import RoleBadge from '../../../components/user/RoleBadge';
import { useUsers } from '../../../hooks/userHooks';
import { useDebounce } from '../../../hooks/useDebounce';
import { CohortMatchMode, CohortType, SortOrder } from '@nonce/shared';
import type { UserSearchResultDto, UsersSortBy } from '../../../types/userOverview';
import {
  cohortTypeToName,
  cohortTypeToShortName,
  formatCohortDate,
} from '../../../helpers/cohortHelpers';
import { extractErrorMessage, isBadFilterError } from '../../../utils/errorUtils';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 25;

// Declaration order is the order the server returns completed courses in, so
// reusing it keeps the filter pills and the table chips reading the same way.
const COHORT_TYPES = Object.values(CohortType);

// Past this many the chips would wrap and the row heights would go ragged.
const MAX_VISIBLE_COHORT_CHIPS = 3;

// ---- helpers ----

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AVATAR_TINTS = [
  { bg: 'rgba(249,115,22,0.15)', color: '#fb923c' },
  { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
  { bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
  { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  { bg: 'rgba(244,114,182,0.15)', color: '#f472b6' },
];
const tintFor = (seed: string) => AVATAR_TINTS[hash(seed) % AVATAR_TINTS.length];

// ---- page ----

const UsersAdmin = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [sortKey, setSortKey] = useState<UsersSortBy>('createdAt');
  const [sortDir, setSortDir] = useState<SortOrder>(SortOrder.DESC);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Held as a string so the field can be empty; 0 and empty both mean "no
  // minimum", which is why it is only sent when it parses to something positive.
  const [minCompleted, setMinCompleted] = useState('');
  const [cohortTypes, setCohortTypes] = useState<CohortType[]>([]);
  const [matchMode, setMatchMode] = useState<CohortMatchMode>(CohortMatchMode.ANY);

  const debouncedSearch = useDebounce(search.trim(), 300);
  const debouncedLocation = useDebounce(location.trim(), 300);
  const debouncedMinCompleted = useDebounce(minCompleted.trim(), 300);
  const minCompletedCohorts = Number(debouncedMinCompleted) || 0;

  // Reset to the first page whenever the query, filters or sort change.
  useEffect(() => {
    setPage(0);
  }, [
    debouncedSearch,
    debouncedLocation,
    minCompletedCohorts,
    cohortTypes,
    matchMode,
    sortKey,
    sortDir,
    pageSize,
  ]);

  const { data, isLoading, isError, error } = useUsers(
    {
      page,
      pageSize,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(debouncedLocation ? { location: debouncedLocation } : {}),
      ...(minCompletedCohorts > 0 ? { minCompletedCohorts } : {}),
      ...(cohortTypes.length > 0
        ? { completedCohortTypes: cohortTypes, completedCohortMatch: matchMode }
        : {}),
      sortBy: sortKey,
      sortOrder: sortDir,
    },
    { placeholderData: (prev) => prev },
  );

  const users = useMemo(() => data?.records ?? [], [data?.records]);
  const totalRecords = data?.totalRecords ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRecords / pageSize));
  const hasFilters =
    Boolean(debouncedSearch) ||
    Boolean(debouncedLocation) ||
    minCompletedCohorts > 0 ||
    cohortTypes.length > 0;

  const toggleCohortType = (type: CohortType) => {
    setCohortTypes((current) =>
      current.includes(type)
        ? current.filter((selected) => selected !== type)
        : // Rebuilt in COHORT_TYPES order rather than appended, so picking the
          // same two courses in either order yields one query cache entry.
          COHORT_TYPES.filter((candidate) => candidate === type || current.includes(candidate)),
    );
  };

  const toggleSort = (key: UsersSortBy) => {
    if (sortKey === key) {
      setSortDir((d) => (d === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC));
    } else {
      setSortKey(key);
      setSortDir(SortOrder.DESC);
    }
  };

  return (
    <FellowshipPageLayout
      title="Users"
      subtitle="Search users and view their participation."
      badge="Admin"
      hideIcon
    >
      {isError && (
        <Alert severity={isBadFilterError(error) ? 'warning' : 'error'} sx={{ mb: 2 }}>
          {isBadFilterError(error)
            ? `Invalid search — please adjust and try again. (${extractErrorMessage(error)})`
            : `Couldn't load users: ${extractErrorMessage(error)}`}
        </Alert>
      )}

      <Stack spacing={1.5} sx={{ mt: 1.5, mb: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ sm: 'center' }}
        >
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, Discord…"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={14} />
                  </InputAdornment>
                ),
              },
              htmlInput: { maxLength: 100 },
            }}
            sx={{ flexGrow: 1, maxWidth: { sm: 420 } }}
          />
          {/* Matches the free-form profile location, so a country or region works too.
              Flexible rather than fixed so this row cannot overflow beside the sidebar. */}
          <TextField
            size="small"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Filter by city…"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <MapPin size={14} />
                  </InputAdornment>
                ),
              },
              htmlInput: { maxLength: 100, 'aria-label': 'Filter by city' },
            }}
            sx={{ flexGrow: 1, maxWidth: { sm: 260 } }}
          />
          <TextField
            size="small"
            type="number"
            value={minCompleted}
            onChange={(e) => setMinCompleted(e.target.value)}
            label="Min courses"
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: 0, max: COHORT_TYPES.length, 'aria-label': 'Minimum courses completed' },
            }}
            sx={{ width: 140 }}
          />
        </Stack>

        <Stack direction="row" spacing={0.75} flexWrap="wrap" alignItems="center" sx={{ rowGap: 1 }}>
          <Typography
            sx={{ fontSize: '0.72rem', color: 'text.secondary', mr: 0.25, whiteSpace: 'nowrap' }}
          >
            Completed
          </Typography>
          {COHORT_TYPES.map((type) => (
            <FilterPill
              key={type}
              label={cohortTypeToShortName(type)}
              title={cohortTypeToName(type)}
              active={cohortTypes.includes(type)}
              onClick={() => toggleCohortType(type)}
            />
          ))}
          {/* With one course selected the two modes mean the same thing, so the
              toggle only earns its space once there are at least two. */}
          {cohortTypes.length > 1 && (
            <>
              <Box sx={{ width: '1px', height: 20, bgcolor: 'divider', mx: 0.5 }} />
              <FilterPill
                label="Any"
                title="Completed at least one of the selected courses"
                active={matchMode === CohortMatchMode.ANY}
                onClick={() => setMatchMode(CohortMatchMode.ANY)}
              />
              <FilterPill
                label="All"
                title="Completed every selected course"
                active={matchMode === CohortMatchMode.ALL}
                onClick={() => setMatchMode(CohortMatchMode.ALL)}
              />
            </>
          )}
        </Stack>
      </Stack>

      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 0.75,
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <HeaderRow sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={22} />
          </Box>
        ) : users.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {hasFilters ? 'No users match your filters.' : 'No users found.'}
            </Typography>
          </Box>
        ) : (
          <>
            {users.map((u) => (
              <UserRow key={u.id} user={u} onOpen={() => navigate(`/admin/users/${u.id}`)} />
            ))}
            {totalRecords > 0 && (
              <PaginationFooter
                page={page}
                pageCount={pageCount}
                total={totalRecords}
                pageSize={pageSize}
                onChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </>
        )}
      </Box>
    </FellowshipPageLayout>
  );
};

// ---- filter pill ----

// Same shape as the filter chips on the fellowship applications admin page, so
// the two admin tables read as one surface.
const FilterPill = ({
  label,
  title,
  active,
  onClick,
}: {
  label: string;
  title: string;
  active: boolean;
  onClick: () => void;
}) => (
  <Box
    component="button"
    type="button"
    title={title}
    aria-pressed={active}
    onClick={onClick}
    sx={{
      px: 1.25,
      py: 0.4,
      borderRadius: 999,
      border: '1px solid',
      borderColor: active ? 'primary.main' : 'divider',
      bgcolor: active ? 'rgba(249,115,22,0.08)' : 'background.paper',
      color: active ? 'primary.light' : 'text.secondary',
      fontFamily: 'inherit',
      fontWeight: 600,
      fontSize: '0.74rem',
      cursor: 'pointer',
      transition: 'all 0.15s',
      '&:hover': active ? {} : { borderColor: 'primary.light', color: 'text.primary' },
    }}
  >
    {label}
  </Box>
);

// ---- cohort chips ----

const CohortChips = ({ types }: { types: CohortType[] }) => {
  if (types.length === 0) {
    return <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>—</Typography>;
  }

  const visible = types.slice(0, MAX_VISIBLE_COHORT_CHIPS);
  const overflow = types.length - visible.length;

  return (
    <Stack
      direction="row"
      spacing={0.5}
      alignItems="center"
      title={types.map(cohortTypeToName).join(', ')}
      sx={{ minWidth: 0, overflow: 'hidden', pr: 1 }}
    >
      {visible.map((type) => (
        <Box
          key={type}
          sx={{
            px: 0.75,
            py: 0.15,
            borderRadius: 0.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(255,255,255,0.03)',
            fontFamily: fontFamilyMono,
            fontSize: '0.68rem',
            fontWeight: 600,
            color: 'text.secondary',
            whiteSpace: 'nowrap',
          }}
        >
          {cohortTypeToShortName(type)}
        </Box>
      ))}
      {overflow > 0 && (
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', flexShrink: 0 }}>
          +{overflow}
        </Typography>
      )}
    </Stack>
  );
};

// ---- table header ----

// Order: User, Email, Discord, Role, Location, Courses, Joined. The minimums are
// kept tight on purpose: seven tracks plus gaps have to fit the content area
// beside the sidebar, and the container clips rather than scrolls, so a generous
// minimum silently cuts the last column off. Adding Location took the row past
// what six tracks needed, so every minimum came down and the gap narrowed to pay
// for it -- all of these cells ellipsize, so they degrade rather than break.
const COLS =
  'minmax(140px, 1.5fr) minmax(125px, 1.3fr) minmax(100px, 1fr) minmax(90px, 0.8fr) minmax(100px, 1fr) minmax(140px, 1.2fr) minmax(95px, 0.8fr)';
const COL_GAP = 1.5;

const SortableHeader = ({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortOrder;
  onClick: () => void;
}) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.4,
      cursor: 'pointer',
      userSelect: 'none',
      color: active ? 'primary.light' : 'inherit',
      '&:hover': { color: 'text.primary' },
    }}
  >
    {label}
    {active && (dir === SortOrder.ASC ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
  </Box>
);

const HeaderRow = ({
  sortKey,
  sortDir,
  onSort,
}: {
  sortKey: UsersSortBy;
  sortDir: SortOrder;
  onSort: (key: UsersSortBy) => void;
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: COLS,
      columnGap: COL_GAP,
      px: 2,
      py: 1,
      borderBottom: '1px solid',
      borderColor: 'divider',
      color: 'text.secondary',
      fontSize: '0.66rem',
      letterSpacing: 0.8,
      fontWeight: 700,
      textTransform: 'uppercase',
    }}
  >
    <SortableHeader
      label="User"
      active={sortKey === 'name'}
      dir={sortDir}
      onClick={() => onSort('name')}
    />
    <SortableHeader
      label="Email"
      active={sortKey === 'email'}
      dir={sortDir}
      onClick={() => onSort('email')}
    />
    <Box>Discord</Box>
    <Box>Role</Box>
    {/* Not sortable: the backend UserSortBy whitelist only accepts createdAt/name/email. */}
    <Box>Location</Box>
    {/* Not sortable: the server has no sort key for completed courses. */}
    <Box>Courses</Box>
    <SortableHeader
      label="Joined"
      active={sortKey === 'createdAt'}
      dir={sortDir}
      onClick={() => onSort('createdAt')}
    />
  </Box>
);

// ---- pagination footer ----

const PaginationFooter = ({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) => {
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1 }}>
      <RowsPerPageSelect value={pageSize} onChange={onPageSizeChange} />
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography sx={{ fontFamily: fontFamilyMono, fontSize: '0.74rem', color: 'text.secondary' }}>
          {from}–{to} of {total}
        </Typography>
        <IconButton
          size="small"
          aria-label="Previous page"
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          <ChevronLeft size={16} />
        </IconButton>
        <Typography sx={{ fontFamily: fontFamilyMono, fontSize: '0.74rem', color: 'text.secondary' }}>
          {page + 1} / {pageCount}
        </Typography>
        <IconButton
          size="small"
          aria-label="Next page"
          disabled={page >= pageCount - 1}
          onClick={() => onChange(page + 1)}
          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          <ChevronRight size={16} />
        </IconButton>
      </Stack>
    </Stack>
  );
};

const RowsPerPageSelect = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (size: number) => void;
}) => (
  <Stack direction="row" spacing={0.75} alignItems="center">
    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Rows</Typography>
    <TextField
      select
      size="small"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      slotProps={{ htmlInput: { 'aria-label': 'Rows per page' } }}
      sx={{ '& .MuiSelect-select': { py: 0.25, pl: 1, fontSize: '0.74rem' } }}
    >
      {PAGE_SIZE_OPTIONS.map((n) => (
        <MenuItem key={n} value={n} sx={{ fontSize: '0.8rem' }}>
          {n}
        </MenuItem>
      ))}
    </TextField>
  </Stack>
);

// ---- row ----

const UserRow = ({ user, onOpen }: { user: UserSearchResultDto; onOpen: () => void }) => {
  const tint = tintFor(user.id);
  const subtitle = user.name && user.name !== user.displayName ? user.name : null;

  return (
    <Box
      onClick={onOpen}
      sx={{
        display: 'grid',
        gridTemplateColumns: COLS,
        columnGap: COL_GAP,
        alignItems: 'center',
        px: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'background-color 0.12s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.025)' },
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      {/* User */}
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: tint.bg,
            color: tint.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials(user.displayName)}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '0.86rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.displayName}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>

      {/* Email */}
      <Typography
        sx={{
          fontSize: '0.82rem',
          color: user.email ? 'text.primary' : 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pr: 1,
        }}
      >
        {user.email ?? '—'}
      </Typography>

      {/* Discord */}
      <Typography
        sx={{
          fontFamily: fontFamilyMono,
          fontSize: '0.78rem',
          color: 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pr: 1,
        }}
      >
        {user.discordUsername}
      </Typography>

      {/* Role */}
      <Box>
        <RoleBadge role={user.role} />
      </Box>

      {/* Location */}
      <Typography
        sx={{
          fontSize: '0.82rem',
          color: user.location ? 'text.primary' : 'text.secondary',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          pr: 1,
        }}
      >
        {user.location ?? '—'}
      </Typography>

      {/* Courses completed */}
      <CohortChips types={user.completedCohortTypes} />

      {/* Joined */}
      <Typography sx={{ fontFamily: fontFamilyMono, fontSize: '0.78rem', color: 'text.secondary' }}>
        {formatCohortDate(user.createdAt)}
      </Typography>
    </Box>
  );
};

export default UsersAdmin;
