import Hero from "@/components/ui/animated-shader-hero";
import { useGameStore } from "@/game/state";
import { deleteSave } from "@/game/save";

export default function EndScreen() {
  const handlePlayAgain = () => {
    // Delete save and reload the page to start fresh
    deleteSave();
    window.location.reload();
  };

  const handleMainMenu = () => {
    // Navigate to main menu (or home page)
    window.location.href = '/';
  };

  return (
    <div className="fixed inset-0 z-[200]">
      <Hero
        trustBadge={{
          text: "You have completed your journey.",
          icons: ["✨"]
        }}
        headline={{
          line1: "The Whispers",
          line2: "Have Ceased"
        }}
        subtitle="You have faced the cube and emerged from the darkness. The ancient mysteries have been revealed, and your story has come to an end. Will you dare to venture into the darkness once more?"
        buttons={{
          primary: {
            text: "Play Again",
            onClick: handlePlayAgain
          },
          secondary: {
            text: "Main Menu",
            onClick: handleMainMenu
          }
        }}
      />
    </div>
  );
}