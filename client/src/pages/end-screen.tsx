
import { useEffect, useState } from "react";
import Hero from "@/components/ui/animated-shader-hero";
import { deleteSave } from "@/game/save";

export default function EndScreenPage() {
  const [sdkInitialized, setSdkInitialized] = useState(false);

  useEffect(() => {
    // Enable sidebar on end screen after 5 seconds
    const timer = setTimeout(async () => {
      try {
        const module = await import(
          "https://sdk.playlight.dev/playlight-sdk.es.js"
        );
        const playlightSDK = module.default;
        
        // Reconfigure SDK to enable sidebar
        playlightSDK.setConfig({
          sidebar: {
            hasFrameworkRoot: true,
            forceVisible: true
          }
        });
        
        setSdkInitialized(true);
        console.log("[PLAYLIGHT] Sidebar enabled on end screen");
      } catch (error) {
        console.error("Error enabling Playlight SDK sidebar:", error);
      }
    }, 7000);

    // Cleanup: hide sidebar when leaving the page
    return () => {
      clearTimeout(timer);
      (async () => {
        try {
          const module = await import(
            "https://sdk.playlight.dev/playlight-sdk.es.js"
          );
          const playlightSDK = module.default;
          
          // Reconfigure SDK to disable sidebar
          playlightSDK.setConfig({
            sidebar: {
              hasFrameworkRoot: true,
              forceVisible: false
            }
          });
        } catch (error) {
          console.error("Error hiding sidebar:", error);
        }
      })();
    };
  }, []);

  const handleMainMenu = async () => {
    // Navigate to main menu (or home page)
    window.location.href = "/";
  };

  const handleCruelMode = async () => {
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
        subtitle3=""
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
