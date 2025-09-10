import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';
import { manualSave } from '@/game/loop';

export default function GameHeader() {
  const { lastSaved } = useGameStore();

  const handleSaveGame = async () => {
    await manualSave();
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
      </div>
    </header>
  );
}
