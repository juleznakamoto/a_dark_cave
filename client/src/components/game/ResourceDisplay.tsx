import { useGameStore } from '@/game/state';

export default function ResourceDisplay() {
  const { resources } = useGameStore();

  return (
    <div className="px-4 py-3 border-t border-border">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Resources
      </h3>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Wood</span>
          <span className="font-mono" data-testid="resource-wood">
            {resources.wood}
          </span>
        </div>
        <div className="flex justify-between opacity-50">
          <span>Food</span>
          <span className="font-mono" data-testid="resource-food">
            {resources.food}
          </span>
        </div>
      </div>
    </div>
  );
}
