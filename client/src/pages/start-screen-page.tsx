import { useEffect, useState, Suspense, lazy } from "react";
import StartScreen from "@/components/game/StartScreen";
import { useGameStore } from "@/game/state";

// Lazy load Game component - only loaded when needed
const Game = lazy(() => import("@/pages/game"));

/**
 * Standalone start screen page that doesn't load the heavy Game component.
 * Only loads Game after user clicks "Light Fire".
 */
export default function StartScreenPage() {
  const [shouldLoadGame, setShouldLoadGame] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const flags = useGameStore((state) => state.flags);

  // Check if game has already started (from saved state or /boost path)
  useEffect(() => {
    const checkGameState = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/33ba3fb0-527b-48ba-8316-dce19cab51cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'start-screen-page.tsx:20',message:'checkGameState start',data:{useGameStoreExists:!!useGameStore,useGameStoreType:typeof useGameStore,hasGetState:useGameStore&&typeof useGameStore.getState==='function'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,E'})}).catch(()=>{});
      // #endregion
      const isGamePath = window.location.pathname === "/boost" || 
                        new URLSearchParams(window.location.search).get("game") === "true";
      
      // If it's a game path, load Game immediately
      if (isGamePath) {
        setShouldLoadGame(true);
        setIsChecking(false);
        return;
      }

      // Load saved game state to check if game has already started
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/33ba3fb0-527b-48ba-8316-dce19cab51cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'start-screen-page.tsx:34',message:'before loadGame call',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        await useGameStore.getState().loadGame();
        // After loading, check if game has started
        const currentFlags = useGameStore.getState().flags;
        if (currentFlags.gameStarted) {
          setShouldLoadGame(true);
        }
      } catch (error) {
        // If loading fails, just show start screen
        console.error("Failed to check saved game state:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkGameState();
  }, []);

  // Also watch for gameStarted flag changes (when Light Fire is clicked)
  useEffect(() => {
    if (flags.gameStarted) {
      setShouldLoadGame(true);
    }
  }, [flags.gameStarted]);

  // Show loading state while checking
  if (isChecking) {
    return <div className="min-h-screen bg-black"></div>;
  }

  // Dynamically load Game component only when needed
  if (shouldLoadGame) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-black"></div>}>
        <Game />
      </Suspense>
    );
  }

  // Show start screen - this doesn't load Game component
  return <StartScreen />;
}
