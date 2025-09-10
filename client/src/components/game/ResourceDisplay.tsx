import { useGameStore } from '@/game/state';

export default function ResourceDisplay() {
  const { resources, story } = useGameStore();

  // Show the resource display if player has ever gathered any resources
  const hasEverSeenWood = story.seen.hasWood || resources.wood > 0;
  const hasEverSeenFood = story.seen.hasFood || resources.food > 0;
  const hasEverSeenTorch = story.seen.hasTorch || resources.torch > 0;
  
  const hasAnyResources = hasEverSeenWood || hasEverSeenFood || hasEverSeenTorch;

  if (!hasAnyResources) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-t border-border">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Resources
      </h3>
      <div className="space-y-1 text-sm">
        {hasEverSeenWood && (
          <div className="flex justify-between">
            <span>Wood</span>
            <span className="font-mono" data-testid="resource-wood">
              {resources.wood}
            </span>
          </div>
        )}
        {hasEverSeenFood && (
          <div className="flex justify-between">
            <span>Food</span>
            <span className="font-mono" data-testid="resource-food">
              {resources.food}
            </span>
          </div>
        )}
        {hasEverSeenTorch && (
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
