import { useEffect } from "react";
import GameContainer from "@/components/game/GameContainer";
import { useGameStore } from "@/game/state";
import { startGameLoop } from "@/game/loop";
import { loadGame } from "@/game/save";

export default function Game() {
  const { initialize } = useGameStore();

  useEffect(() => {
    const initializeGame = async () => {
      // Load saved game or initialize with defaults
      const savedState = await loadGame();
      if (savedState) {
        initialize(savedState);
      }
      
      // Start game loop
      startGameLoop();
    };

    initializeGame();
  }, [initialize]);

  return <GameContainer />;
}
