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
            text: "Extreme Mode",
            onClick: handleExtremeMode,
          },
          secondary: {
            text: "Close",
            onClick: handleMainMenu,
          },
        }}
      />
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[100000] flex flex-col items-center gap-3">
        <p className="text-sm text-gray-300 text-center max-w-md px-4">
          If you enjoyed the game, consider supporting me so I can continue to develop it.
        </p>
        <a
          href="https://buymeacoffee.com/julez.b"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg transition-colors duration-200"
        >
          <span>☕</span>
          <span>Buy Me a Coffee</span>
        </a>
      </div>
    </div>
  );
}
