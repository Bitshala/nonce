import { Box, Badge } from '@mui/material';

type Tab = {
  label: string;
  value: string;
  count?: number;
};

type TabsProps = {
  tabs: Tab[];
  activeTab: string;
  onChange: (value: string) => void;
  accent?: string;
};

const DEFAULT_ACCENT = '#f97316';

const Tabs = ({ tabs, activeTab, onChange, accent = DEFAULT_ACCENT }: TabsProps) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <Box
            key={tab.value}
            onClick={() => onChange(tab.value)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 0.75,
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: isActive ? accent : '#3f3f46',
              bgcolor: isActive ? `${accent}1a` : 'transparent',
              color: isActive ? accent : '#71717a',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              userSelect: 'none',
              transition: 'all 150ms ease',
              '&:hover': {
                borderColor: isActive ? accent : '#52525b',
                color: isActive ? accent : '#d4d4d8',
                bgcolor: isActive ? `${accent}1a` : 'rgba(255,255,255,0.04)',
              },
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <Badge
                badgeContent={tab.count}
                showZero
                sx={{
                  '& .MuiBadge-badge': {
                    position: 'relative',
                    transform: 'none',
                    bgcolor: isActive ? `${accent}33` : '#3f3f46',
                    color: isActive ? accent : '#71717a',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    minWidth: 20,
                    height: 20,
                    borderRadius: '10px',
                  },
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default Tabs;
