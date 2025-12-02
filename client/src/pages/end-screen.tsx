
import { useEffect, useState } from "react";
import Hero from "@/components/ui/animated-shader-hero";
import { deleteSave } from "@/game/save";
import { useGameStore } from "@/game/state";

export default function EndScreenPage() {
  const [sdkInitialized, setSdkInitialized] = useState(false);

  useEffect(() => {
    // Initialize sidebar immediately, then show it after 5 seconds
    (async () => {
      try {
        const module = await import(
          "https://sdk.playlight.dev/playlight-sdk.es.js"
        );
        const playlightSDK = module.default;
        
        // Re-initialize SDK with sidebar forced visible
        playlightSDK.init({
          exitIntent: {
            enabled: true,
            immediate: false
          },
          sidebar: {
            hasFrameworkRoot: true,
            forceVisible: true
          }
        });
        
        console.log("[PLAYLIGHT] SDK re-initialized on end screen with sidebar");
        
        // Wait 5 seconds then mark as initialized for UI update
        setTimeout(() => {
          setSdkInitialized(true);
          console.log("[PLAYLIGHT] Sidebar should now be visible");
        }, 5000);
      } catch (error) {
        console.error("Error loading the Playlight SDK:", error);
      }
    })();
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
