import { IconButton, Tooltip } from '@mui/material';
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
          color: active ? 'common.white' : 'workspace.muted',
          bgcolor: active ? 'workspace.chip' : 'transparent',
          border: 1,
          borderColor: active ? 'workspace.lineStrong' : 'transparent',
          '&:hover': { bgcolor: 'workspace.chip' },
        }}
      >
        {icon}
      </IconButton>
    </span>
  </Tooltip>
);
