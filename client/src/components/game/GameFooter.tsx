import { useGameStore } from '@/game/state';

export default function GameFooter() {
  const { isGameLoopActive, version } = useGameStore();

  return (
    <footer className="border-t border-border px-6 py-2 text-xs text-muted-foreground">
      <div className="flex justify-between items-center">
        <span data-testid="game-loop-status">
          Game Loop: {isGameLoopActive ? 'Active' : 'Inactive'} (200ms ticks)
        </span>
        <span data-testid="game-version">v{version}.0.0</span>
      </div>
    </footer>
  );
}
