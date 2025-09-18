
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';
import { manualSave } from '@/game/loop';
import { deleteSave } from '@/game/save';

export default function GameFooter() {
  const { lastSaved, restartGame, version } = useGameStore();

  const handleSaveGame = async () => {
    await manualSave();
  };

  const handleRestartGame = async () => {
    if (confirm('Are you sure you want to restart the game? This will delete your current progress.')) {
      await deleteSave();
      restartGame();
    }
  };

  return (
    <footer className="border-t border-border px-6 py-2 text-xs text-muted-foreground">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span>Last saved: {lastSaved}</span>
          <Button 
            variant="outline"
            size="sm"
            onClick={handleSaveGame}
            data-testid="button-save-game"
            className="px-3 py-1 text-xs"
          >
            Save Game
          </Button>
          <Button 
            variant="outline"
            size="sm"
            onClick={handleRestartGame}
            data-testid="button-restart-game"
            className="px-3 py-1 text-xs"
          >
            New Game
          </Button>
        </div>
        <span data-testid="game-version">v{version}.0.0</span>
      </div>
    </footer>
  );
}
