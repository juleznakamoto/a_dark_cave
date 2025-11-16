import Hero from "@/components/ui/animated-shader-hero";
import { deleteSave } from "@/game/save";
import { useGameStore } from "@/game/state";

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

  const handleCruelMode = () => {
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
        subtitle="At least for now... You finished the first chapter. Feel free to play again or try Cruel Mode (coming soon)."
        buttons={{
          primary: {
            text: " ⛤ Cruel Mode (coming soon)",
            onClick: handleCruelMode,
          },
          secondary: {
            text: "Close",
            onClick: handleMainMenu,
          },
        }}
      />
    </div>
  );
}
