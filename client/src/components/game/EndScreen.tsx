import Hero from "@/components/ui/animated-shader-hero";
import { deleteSave } from "@/game/save";
import { useGameStore } from "@/game/state";
import { Button } from "@/components/ui/button";

export default function EndScreen() {
  const { setShopDialogOpen, setShowEndScreen } = useGameStore();

  const handlePlayAgain = () => {
    // Delete save and reload the page to start fresh
    deleteSave();
    window.location.reload();
  };

  const handleMainMenu = () => {
    // Navigate to main menu (or home page)
    window.location.href = "/";
  };

  const handleExtremeMode = () => {
    // Close end screen and open shop
    setShowEndScreen(false);
    setShopDialogOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[99999]">
      <Hero
        trustBadge={{
          text: "Well Done!",
        }}
        headline={{
          line1: "Your Journey",
          line2: "Ends Here",
        }}
        subtitle="At least for now... You finished the first chapter. Feel free to play again or try Extreme Mode."
        buttons={{
          primary: {
            text: "Play Again",
            onClick: handlePlayAgain,
          },
          secondary: {
            text: "Close",
            onClick: handleMainMenu,
          },
        }}
      />
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <Button
          onClick={handleExtremeMode}
          variant="outline"
          className="bg-red-950/80 text-red-100 border-red-600 hover:bg-red-900/80 hover:text-red-50"
        >
          ⚠ Extreme Mode
        </Button>
      </div>
    </div>
  );
}
