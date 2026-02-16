type StatusVariant = 'Active' | 'Upcoming' | 'Completed' | 'Inactive';

const variantStyles: Record<StatusVariant, string> = {
  Active: 'bg-green-500/15 text-green-400 ring-green-500/20',
  Upcoming: 'bg-blue-500/15 text-blue-400 ring-blue-500/20',
  Completed: 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/20',
  Inactive: 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/20',
};

type StatusBadgeProps = {
  status: string;
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const variant = (status in variantStyles ? status : 'Inactive') as StatusVariant;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ring-1 ring-inset ${variantStyles[variant]}`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
