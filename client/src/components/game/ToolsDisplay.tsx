import { useGameStore } from '@/game/state';

export default function ToolsDisplay() {
  const { tools } = useGameStore();

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
        {!tools.axe && !tools.spear && (
          <div className="text-xs opacity-50">No tools</div>
        )}
      </div>
    </div>
  );
}
