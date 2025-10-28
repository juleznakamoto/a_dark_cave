import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { manualSave } from "@/game/loop";
import { deleteSave } from "@/game/save";
import { useState } from "react";

const VERSION = "0.14.3";

export default function GameFooter() {
  const { lastSaved, restartGame } = useGameStore();
  const [glowingButton, setGlowingButton] = useState<string | null>(null);

  const handleSaveGame = async () => {
    setGlowingButton("save");
    await manualSave();
    setTimeout(() => setGlowingButton(null), 500);
  };

  const handleRestartGame = async () => {
    if (
      confirm(
        "Restarting the game will delete your current progress. Are you sure to restart?",
      )
    ) {
      await deleteSave();
      restartGame();
    }
  };

  const handleOfferTribute = () => {
    window.open("https://www.buymeacoffee.com/julez.b", "_blank");
  };

  return (
    <footer className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="xs"
            onClick={handleSaveGame}
            data-testid="button-save-game"
            className={`px-3 py-1 text-xs no-hover ${glowingButton === "save" ? "button-glow-animation" : ""}`}
          >
            Save Game
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={handleRestartGame}
            data-testid="button-restart-game"
            className="px-3 py-1 text-xs no-hover"
          >
            New Game
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={handleOfferTribute}
            className="px-3 py-1 text-xs no-hover"
          >
            Offer Tribute
          </Button>
        </div>
        <span data-testid="game-version">v{VERSION}</span>
      </div>
    </footer>
  );
}
