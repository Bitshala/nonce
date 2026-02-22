import { Tab as MuiTab, Tabs as MuiTabs, Badge } from '@mui/material';

type Tab = {
  label: string;
  value: string;
  count?: number;
};

type TabsProps = {
  tabs: Tab[];
  activeTab: string;
  onChange: (value: string) => void;
};

const Tabs = ({ tabs, activeTab, onChange }: TabsProps) => {
  return (
    <MuiTabs
      value={activeTab}
      onChange={(_, val) => onChange(val)}
      sx={{
        minHeight: 44,
        '& .MuiTabs-indicator': { bgcolor: '#f97316', height: 2.5, borderRadius: 1 },
      }}
    >
      {tabs.map((tab) => (
        <MuiTab
          key={tab.value}
          value={tab.value}
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {tab.label}
              {tab.count !== undefined && (
                <Badge
                  badgeContent={tab.count}
                  sx={{
                    '& .MuiBadge-badge': {
                      position: 'relative',
                      transform: 'none',
                      bgcolor: activeTab === tab.value ? 'rgba(249,115,22,0.2)' : '#3f3f46',
                      color: activeTab === tab.value ? '#fb923c' : '#71717a',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      minWidth: 22,
                      height: 22,
                      borderRadius: '11px',
                    },
                  }}
                />
              )}
            </span>
          }
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.9rem',
            color: '#71717a',
            minHeight: 44,
            px: 2.5,
            '&.Mui-selected': { color: '#fb923c' },
            '&:hover': { color: '#d4d4d8' },
          }}
        />
      ))}
    </MuiTabs>
  );
};

export default Tabs;
