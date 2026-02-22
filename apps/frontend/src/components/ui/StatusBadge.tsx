import { Chip } from '@mui/material';

type StatusVariant = 'Active' | 'Upcoming' | 'Completed' | 'Inactive';

const variantStyles: Record<StatusVariant, { bgcolor: string; color: string; borderColor: string }> = {
  Active: { bgcolor: 'rgba(34,197,94,0.15)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.3)' },
  Upcoming: { bgcolor: 'rgba(59,130,246,0.15)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.3)' },
  Completed: { bgcolor: 'rgba(161,161,170,0.15)', color: '#a1a1aa', borderColor: 'rgba(161,161,170,0.3)' },
  Inactive: { bgcolor: 'rgba(161,161,170,0.15)', color: '#a1a1aa', borderColor: 'rgba(161,161,170,0.3)' },
};

type StatusBadgeProps = {
  status: string;
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const variant = (status in variantStyles ? status : 'Inactive') as StatusVariant;
  const styles = variantStyles[variant];
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        fontWeight: 500,
        fontSize: '0.8rem',
        bgcolor: styles.bgcolor,
        color: styles.color,
        border: `1px solid ${styles.borderColor}`,
        height: 28,
      }}
    />
  );
};

export default StatusBadge;
