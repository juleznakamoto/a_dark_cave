import { useEffect } from "react";
import { useGameStore } from "@/game/state";

export default function EndScreen() {
  useEffect(() => {
    // Clear the flag immediately to prevent showing again
    useGameStore.setState({ showEndScreen: false });
    
    // Navigate to the dedicated end screen page
    window.location.href = "/end-screen";
  }, []);

  return null;
}