import { useEffect, useState } from "react";
import GameContainer from "@/components/game/GameContainer";
import { useGameStore } from "@/game/state";
import { startGameLoop } from "@/game/loop";
import { loadGame } from "@/game/save";
import EventDialog from "@/components/game/EventDialog";
import CombatDialog from "@/components/game/CombatDialog";

export default function Game() {
  const { initialize } = useGameStore();
  const { eventDialog, setEventDialog, combatDialog, setCombatDialog } =
    useGameStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldStartMusic, setShouldStartMusic] = useState(false);

  useEffect(() => {
    const initializeGame = async () => {
      // Load saved game or initialize with defaults
      const savedState = await loadGame();
      if (savedState) {
        initialize(savedState);

        // If game is already started (fire is lit), flag that music should start on user gesture
        if (savedState.story?.seen?.fireLit) {
          setShouldStartMusic(true);
        }
      }

      // Mark as initialized
      setIsInitialized(true);

      // Start game loop
      startGameLoop();
    };

    initializeGame();
  }, [initialize]);

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
        console.warn("Failed to start background music:", error);
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