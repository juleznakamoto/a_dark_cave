import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';
import ResourceDisplay from './ResourceDisplay';
import ToolsDisplay from './ToolsDisplay';
import { cn } from '@/lib/utils';

export default function GameTabs() {
  const { activeTab, setActiveTab, flags } = useGameStore();

  const tabs = [
    { id: 'cave', label: 'The Cave' },
    ...(flags.villageUnlocked ? [{ id: 'village', label: 'The Village' }] : []),
    ...(flags.worldDiscovered ? [{ id: 'world', label: 'The World' }] : []),
  ];

  return (
    <nav className="border-b border-border">
      <div className="flex space-x-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2',
              activeTab === tab.id
                ? 'border-primary text-primary bg-accent/50'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            )}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ResourceDisplay />
      <ToolsDisplay />
    </nav>
  );
}