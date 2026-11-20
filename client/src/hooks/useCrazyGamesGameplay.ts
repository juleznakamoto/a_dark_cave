import { useEffect } from "react";
import { syncCrazyGamesGameplay } from "@/lib/crazyGames";

/**
 * Basic Launch: `gameplayStart` when the cave is playable, `gameplayStop`
 * on the title screen, on pause, and when this view unmounts.
 */
export function useCrazyGamesGameplay(
  gameStarted: boolean,
  isPaused: boolean,
): void {
  useEffect(() => {
    void syncCrazyGamesGameplay(gameStarted && !isPaused);
    return () => {
      void syncCrazyGamesGameplay(false);
    };
  }, [gameStarted, isPaused]);
}
