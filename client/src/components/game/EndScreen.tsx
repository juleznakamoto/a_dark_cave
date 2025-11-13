import Hero from "@/components/ui/animated-shader-hero";
import { deleteSave } from "@/game/save";

export default function EndScreen() {
  const handlePlayAgain = () => {
    // Delete save and reload the page to start fresh
    deleteSave();
    window.location.reload();
  };

  const handleMainMenu = () => {
    // Navigate to main menu (or home page)
    window.location.href = "/";
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
    </div>
  );
}
