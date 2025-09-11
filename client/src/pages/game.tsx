import { useEffect } from "react";
import GameContainer from "@/components/game/GameContainer";
import { useGameStore } from "@/game/state";
import { startGameLoop } from "@/game/loop";
import { loadGame } from "@/game/save";

export default function Game() {
  const { initialize, loadGame, flags } = useGameStore();

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
  }, [initialize, loadGame]); // Added loadGame to dependency array

  // Debug: Log the current flags state
  useEffect(() => {
    console.log('Current game flags:', flags);
  }, [flags]);

  return <GameContainer />;
}