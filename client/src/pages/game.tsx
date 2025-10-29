import { useEffect, useState } from "react";
import GameContainer from "@/components/game/GameContainer";
import { useGameStore } from "@/game/state";
import { startGameLoop } from "@/game/loop";
import { loadGame } from "@/game/save";
import EventDialog from "@/components/game/EventDialog";
import CombatDialog from "@/components/game/CombatDialog";


export default function Game() {
  const { initialize } = useGameStore();
  const { eventDialog, setEventDialog, combatDialog, setCombatDialog } = useGameStore();
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

  // Start background music on first mouse movement (user gesture)
  useEffect(() => {
    if (!shouldStartMusic) return;

    const handleMouseMove = async () => {
      const { audioManager } = await import('@/lib/audio');
      await audioManager.startBackgroundMusic(0.3);
      setShouldStartMusic(false);
      // Remove listener after music starts
      document.removeEventListener('mousemove', handleMouseMove);
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
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