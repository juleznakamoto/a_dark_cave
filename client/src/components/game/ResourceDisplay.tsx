import { useGameStore } from '@/game/state';

export default function ResourceDisplay() {
  const { resources } = useGameStore();

  // Only show the resource display if player has gathered any resources
  const hasAnyResources = resources.wood > 0 || resources.food > 0 || resources.torch > 0;

  if (!hasAnyResources) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-t border-border">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Resources
      </h3>
      <div className="space-y-1 text-sm">
        {resources.wood > 0 && (
          <div className="flex justify-between">
            <span>Wood</span>
            <span className="font-mono" data-testid="resource-wood">
              {resources.wood}
            </span>
          </div>
        )}
        {resources.food > 0 && (
          <div className="flex justify-between">
            <span>Food</span>
            <span className="font-mono" data-testid="resource-food">
              {resources.food}
            </span>
          </div>
        )}
        {resources.torch > 0 && (
          <div className="flex justify-between">
            <span>Torch</span>
            <span className="font-mono" data-testid="resource-torch">
              {resources.torch}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
