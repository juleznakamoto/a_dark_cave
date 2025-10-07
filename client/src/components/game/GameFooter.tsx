
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';
import { manualSave } from '@/game/loop';
import { deleteSave } from '@/game/save';
import { useState } from 'react';

const VERSION = "0.13.13";

export default function GameFooter() {
  const { lastSaved, restartGame } = useGameStore();
  const [glowingButton, setGlowingButton] = useState<string | null>(null);

  const handleButtonClick = (buttonId: string, action: () => void) => {
    setGlowingButton(buttonId);
    action();
    setTimeout(() => setGlowingButton(null), 300);
  };

  const handleSaveGame = async () => {
    await manualSave();
  };

  const handleRestartGame = async () => {
    if (confirm('Are you sure you want to restart the game? This will delete your current progress.')) {
      await deleteSave();
      restartGame();
    }
  };

  const handleOfferTribute = () => {
    window.open('https://www.buymeacoffee.com/julez.b', '_blank');
  };

  return (
    <footer className="border-t border-border px-6 py-2 text-xs text-muted-foreground">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span>Last saved: {lastSaved}</span>
          <Button 
            variant="outline"
            size="xs"
            onClick={() => handleButtonClick('save', handleSaveGame)}
            data-testid="button-save-game"
            className="px-3 py-1 text-xs no-hover transition-shadow duration-300"
            style={{
              boxShadow: glowingButton === 'save' 
                ? '0 0 20px rgba(255, 99, 71, 0.6), 0 0 30px rgba(255, 69, 0, 0.4)' 
                : 'none'
            }}
          >
            Save Game
          </Button>
          <Button 
            variant="outline"
            size="xs"
            onClick={() => handleButtonClick('restart', handleRestartGame)}
            data-testid="button-restart-game"
            className="px-3 py-1 text-xs no-hover transition-shadow duration-300"
            style={{
              boxShadow: glowingButton === 'restart' 
                ? '0 0 20px rgba(255, 99, 71, 0.6), 0 0 30px rgba(255, 69, 0, 0.4)' 
                : 'none'
            }}
          >
            New Game
          </Button>
          <Button 
            variant="outline"
            size="xs"
            onClick={() => handleButtonClick('tribute', handleOfferTribute)}
            className="px-3 py-1 text-xs no-hover transition-shadow duration-300"
            style={{
              boxShadow: glowingButton === 'tribute' 
                ? '0 0 20px rgba(255, 99, 71, 0.6), 0 0 30px rgba(255, 69, 0, 0.4)' 
                : 'none'
            }}
          >
            Offer Tribute
          </Button>
        </div>
        <span data-testid="game-version">v{VERSION}</span>
      </div>
    </footer>
  );
}
