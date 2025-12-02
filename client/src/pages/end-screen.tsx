
import { useEffect, useState } from "react";
import Hero from "@/components/ui/animated-shader-hero";
import { deleteSave } from "@/game/save";
import { useGameStore } from "@/game/state";

export default function EndScreenPage() {
  const [sdkInitialized, setSdkInitialized] = useState(false);

  useEffect(() => {
    // SDK is already initialized in App.tsx, just wait 5 seconds before showing message
    const timer = setTimeout(() => {
      setSdkInitialized(true);
      console.log("[PLAYLIGHT] End screen loaded, sidebar should be visible");
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handlePlayAgain = () => {
    // Delete save and reload the page to start fresh
    deleteSave();
    window.location.href = "/game";
  };

  const handleMainMenu = () => {
    // Navigate to main menu (or home page)
    window.location.href = "/";
  };

  const handleCruelMode = () => {
    // Navigate back to game with shop open
    window.location.href = "/game?openShop=true";
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
        subtitle1="At least for now..."
        subtitle2="Try Cruel Mode for an even bigger challenge with an extended gameplay."
        subtitle3={sdkInitialized ? "Discover more games in the sidebar!" : ""}
        buttons={{
          primary: {
            text: "⛤ Cruel Mode",
            onClick: handleCruelMode,
            buttonId: "end-screen-cruel-mode",
          },
          secondary: {
            text: "Close",
            onClick: handleMainMenu,
            buttonId: "end-screen-close",
          },
        }}
      />
    </div>
  );
}
