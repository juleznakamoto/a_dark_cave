import { useEffect, useState } from "react";
import GameContainer from "@/components/game/GameContainer";
import { useGameStore } from "@/game/state";
import { startGameLoop, stopGameLoop } from "@/game/loop";
import { loadGame, saveGame } from "@/game/save"; // Import saveGame
import EventDialog from "@/components/game/EventDialog";
import CombatDialog from "@/components/game/CombatDialog";
import { logger } from "@/lib/logger";

export default function Game() {
  const { initialize, setState } = useGameStore(); // Added setState
  const { eventDialog, setEventDialog, combatDialog, setCombatDialog } =
    useGameStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldStartMusic, setShouldStartMusic] = useState(false);

  useEffect(() => {
    const initializeGame = async () => {
      // Wait for auth to be ready first
      const { getCurrentUser } = await import('@/game/auth');
      const user = await getCurrentUser();

      // Load saved game or initialize with defaults
      const savedState = await loadGame();
      if (savedState) {
        // Set the loaded state
        setState(savedState);
        logger.log('[GAME] Game loaded from save');

        // If user is logged in and has claimed referrals, save to cloud
        if (user && savedState.referrals && savedState.referrals.some(r => r.claimed)) {
          logger.log('[GAME] Detected claimed referrals - saving to cloud');
          // Use setTimeout to ensure state is fully set before saving
          setTimeout(async () => {
            try {
              await saveGame(savedState, false, false);
              logger.log('[GAME] Successfully saved claimed referrals to cloud');
            } catch (error) {
              logger.error('[GAME] Failed to save claimed referrals:', error);
            }
          }, 1000);
        }
      } else {
        // If no saved state, initialize with defaults
        initialize();
        logger.log('[GAME] Game initialized with defaults');
      }

      // Mark as initialized
      setIsInitialized(true);

      // Start game loop
      startGameLoop();
    };

    initializeGame();

    // Cleanup function to stop the game loop when the component unmounts
    return () => {
      stopGameLoop();
    };
  }, [initialize, setState]); // Added setState dependency

  // Start background music on first user interaction (required by browser autoplay policies)
  useEffect(() => {
    if (!shouldStartMusic) return;

    const handleUserGesture = async () => {
      try {
        const { audioManager } = await import("@/lib/audio");
        const currentState = useGameStore.getState();

        // Set the mute state before starting music
        audioManager.globalMute(currentState.isMuted);

        // Only start music if not muted
        if (!currentState.isMuted) {
          await audioManager.startBackgroundMusic(0.125);
        }
        setShouldStartMusic(false);

        // Remove listeners after music starts
        document.removeEventListener("click", handleUserGesture);
        document.removeEventListener("keydown", handleUserGesture);
        document.removeEventListener("touchstart", handleUserGesture);
      } catch (error) {
        logger.warn("Failed to start background music:", error);
      }
    };

    // Listen for various user gestures
    document.addEventListener("click", handleUserGesture);
    document.addEventListener("keydown", handleUserGesture);
    document.addEventListener("touchstart", handleUserGesture);

    return () => {
      document.removeEventListener("click", handleUserGesture);
      document.removeEventListener("keydown", handleUserGesture);
      document.removeEventListener("touchstart", handleUserGesture);
    };
  }, [shouldStartMusic]);

  if (!isInitialized) {
    return <div className="min-h-screen bg-black"></div>; // Black screen while loading
  }

  return (
    <div>
      <GameContainer />

      <EventDialog
        isOpen={eventDialog.isOpen}
        onClose={() => setEventDialog(false)}
        event={eventDialog.currentEvent}
      />

      <CombatDialog
        isOpen={combatDialog.isOpen}
        onClose={() => setCombatDialog(false)}
        enemy={combatDialog.enemy}
        eventTitle={combatDialog.eventTitle}
        eventMessage={combatDialog.eventMessage}
        onVictory={combatDialog.onVictory || (() => {})}
        onDefeat={combatDialog.onDefeat || (() => {})}
      />
    </div>
  );
}