import { useEffect, useState } from "react";
import GameContainer from "@/components/game/GameContainer";
import { useGameStore } from "@/game/state";
import { startGameLoop, stopGameLoop } from "@/game/loop";
import { loadGame, saveGame } from "@/game/save"; // Import saveGame
import EventDialog from "@/components/game/EventDialog";
import CombatDialog from "@/components/game/CombatDialog";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/game/auth";

export default function Game() {
  const initialize = useGameStore((state) => state.initialize);
  const { eventDialog, setEventDialog, combatDialog, setCombatDialog, setShopDialogOpen } =
    useGameStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldStartMusic, setShouldStartMusic] = useState(false);

  useEffect(() => {
    logger.log("[GAME PAGE] Initializing game");
    const initializeGame = async () => {
      try {
        // Handle OAuth callback - check for tokens in URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        
        if (accessToken) {
          logger.log("[GAME PAGE] OAuth callback detected, processing authentication");
          // Clear the URL hash/params after reading
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Check if user just signed in with OAuth
        const user = await getCurrentUser();
        if (user) {
          logger.log("[GAME PAGE] User authenticated, loading game");
        }

        // Parse URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check if URL is /boost path or ?game=true param to skip start screen
        const isGamePath = window.location.pathname === '/boost' || urlParams.get('game') === 'true';

        // Check for openShop query parameter only (not /boost path)
        const openShop = urlParams.get('openShop') === 'true';

        // Load saved game or initialize with defaults
        const savedState = await loadGame();
        if (savedState) {
          // Set the loaded state using useGameStore.setState
          useGameStore.setState({
            ...savedState,
            activeTab: 'cave', // Always start on cave tab
            flags: {
              ...savedState.flags,
              gameStarted: isGamePath ? true : savedState.flags.gameStarted, // Force game started if /game path
              hasLitFire: isGamePath ? true : savedState.flags.hasLitFire, // Force fire lit if /game path
            }
          });
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

          // If accessing /game directly, also set the game as started
          if (isGamePath) {
            useGameStore.setState({
              flags: {
                ...useGameStore.getState().flags,
                gameStarted: true,
                hasLitFire: true,
              }
            });
          }

          logger.log('[GAME] Game initialized with defaults');
        }

        // Mark as initialized
        setIsInitialized(true);

        // Start game loop
        startGameLoop();

        // Open shop if requested (after a delay to ensure game is loaded)
        if (openShop) {
          setTimeout(() => {
            setShopDialogOpen(true);
          }, 500);
        }
      } catch (error) {
        logger.error("[GAME PAGE] Failed to initialize game:", error);
      }
    };

    initializeGame();

    // Cleanup function to stop the game loop when the component unmounts
    return () => {
      stopGameLoop();
    };
  }, []); // Empty dependency array - only run once on mount

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