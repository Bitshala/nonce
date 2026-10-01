import { IconButton, Tooltip } from '@mui/material';
import { WORKSPACE } from './workspaceColors.ts';

/** One toggle on the icon rail. */
export const RailButton = ({
  label,
  icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <Tooltip title={label} placement="right">
    <span>
      <IconButton
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
        sx={{
          width: 36,
          height: 36,
          borderRadius: '8px',
          color: active ? 'common.white' : WORKSPACE.muted,
          bgcolor: active ? WORKSPACE.chip : 'transparent',
          border: `1px solid ${active ? WORKSPACE.lineStrong : 'transparent'}`,
          '&:hover': { bgcolor: WORKSPACE.chip },
        }}
      >
        {icon}
      </IconButton>
    </span>
  </Tooltip>
);
