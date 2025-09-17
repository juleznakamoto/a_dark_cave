import { useEffect, useState } from "react";
import GameContainer from "@/components/game/GameContainer";
import { useGameStore } from "@/game/state";
import { startGameLoop } from "@/game/loop";
import { loadGame } from "@/game/save";

export default function Game() {
  const { initialize } = useGameStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeGame = async () => {
      // Load saved game or initialize with defaults
      const savedState = await loadGame();
      if (savedState) {
        initialize(savedState);
      }
      
      // Mark as initialized
      setIsInitialized(true);
      
      // Start game loop
      startGameLoop();
    };

    initializeGame();
  }, [initialize]);

  if (!isInitialized) {
    return <div className="min-h-screen bg-black"></div>; // Black screen while loading
  }

  return <GameContainer />;
}
