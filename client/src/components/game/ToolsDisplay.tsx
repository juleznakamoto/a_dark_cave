import { useGameStore } from '@/game/state';

export default function ToolsDisplay() {
  const { tools, story } = useGameStore();

  // Show the tools display if player has ever acquired any tools
  const hasEverSeenAxe = story.seen.hasAxe || story.seen.actionCraftAxe || tools.axe;
  const hasEverSeenSpear = story.seen.hasSpear || tools.spear;
  
  const hasAnyTools = hasEverSeenAxe || hasEverSeenSpear;

  if (!hasAnyTools) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-t border-border">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Tools
      </h3>
      <div className="space-y-1 text-sm text-muted-foreground">
        {hasEverSeenAxe && (
          <div data-testid="tool-axe">
            {tools.axe ? 'Axe' : 'Axe (missing)'}
          </div>
        )}
        {hasEverSeenSpear && (
          <div data-testid="tool-spear">
            {tools.spear ? 'Spear' : 'Spear (missing)'}
          </div>
        )}
      </div>
    </div>
  );
}
