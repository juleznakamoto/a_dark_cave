import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';
import { manualSave } from '@/game/loop';
import { deleteSave } from '@/game/save';

export default function GameHeader() {
  const { lastSaved, restartGame } = useGameStore();

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
    <header className="border-b border-border px-6 py-4 flex justify-between items-center">
      <h1 className="font-serif text-2xl font-semibold tracking-tight">A Dark Cave</h1>
      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
        <span>Last saved: {lastSaved}</span>
        <Button 
          variant="secondary"
          size="sm"
          onClick={handleSaveGame}
          data-testid="button-save-game"
          className="px-3 py-1 text-xs"
        >
          Save Game
        </Button>
        <div className="flex gap-2">
          <Button 
            onClick={handleRestartGame}
            variant="destructive"
            size="sm"
            data-testid="button-restart-game"
            className="px-3 py-1 text-xs"
          >
            Restart
          </Button>
        </div>
      </div>
    </header>
  );
}