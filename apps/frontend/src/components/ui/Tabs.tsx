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
    <div className="border-b border-zinc-700/50">
      <nav className="flex gap-1" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.value === activeTab;
          return (
            <button
              key={tab.value}
              onClick={() => onChange(tab.value)}
              className={`b-0 relative px-6 py-3.5 text-base font-medium transition-all duration-200 rounded-t-lg ${
                isActive
                  ? 'text-orange-400 bg-zinc-700/40'
                  : 'text-zinc-500 hover:text-zinc-300 bg-transparent'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-semibold ${
                      isActive
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-zinc-700/60 text-zinc-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Tabs;
