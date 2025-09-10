import { useGameStore } from '@/game/state';

export default function ToolsDisplay() {
  const { tools } = useGameStore();

  // Only show the tools display if player has acquired any tools
  const hasAnyTools = tools.axe || tools.spear;

  if (!hasAnyTools) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-t border-border">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Tools
      </h3>
      <div className="space-y-1 text-sm text-muted-foreground">
        {tools.axe && (
          <div data-testid="tool-axe">Axe</div>
        )}
        {tools.spear && (
          <div data-testid="tool-spear">Spear</div>
        )}
      </div>
    </div>
  );
}
