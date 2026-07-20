import { useEffect, useState, Suspense, lazy } from "react";
import StartScreen from "@/components/game/StartScreen";
import LazyRouteErrorBoundary from "@/components/LazyRouteErrorBoundary";
import PageLoadSpinner from "@/components/ui/page-load-spinner";
import { useGameStore } from "@/game/state";
import { isDemoEdition } from "@/lib/edition";
import { isDemoLimitReachedFromState } from "@/game/demoLimit";
import { HARD_RELOAD_CACHE_BUST_PARAM } from "@/lib/hardReload";
import { logger } from "@/lib/logger";

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
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has(HARD_RELOAD_CACHE_BUST_PARAM)) {
        searchParams.delete(HARD_RELOAD_CACHE_BUST_PARAM);
        const cleanUrl =
          window.location.pathname +
          (searchParams.toString() ? `?${searchParams.toString()}` : "") +
          window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      // Stripe PayPal (etc.): return URL includes these; we must load Game to verify and update state
      if (
        searchParams.get("payment_intent") &&
        searchParams.get("redirect_status")
      ) {
        setShouldLoadGame(true);
        setIsChecking(false);
        return;
      }
      const isGamePath = window.location.pathname === "/boost" ||
        searchParams.get("game") === "true" ||
        searchParams.get("email_confirmed") === "true";

      // If it's a game path or email confirmation redirect, load Game immediately
      if (isGamePath) {
        setShouldLoadGame(true);
        setIsChecking(false);
        return;
      }

      // Load saved game state to check if game has already started
      try {
        await Promise.race([
          useGameStore.getState().loadGame(),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error("loadGame timeout")), 15000),
          ),
        ]);
        // After loading, check if game has started
        const currentFlags = useGameStore.getState().flags;
        if (currentFlags.gameStarted) {
          if (isDemoEdition()) {
            const loadedState = useGameStore.getState();
            if (isDemoLimitReachedFromState(loadedState)) {
              useGameStore.setState({ galaxyTimeUpDialogOpen: true });
            }
          }
          setShouldLoadGame(true);
        }
      } catch (error) {
        logger.error("Failed to check saved game state:", error);
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
    return <PageLoadSpinner />;
  }

  // Dynamically load Game component only when needed
  if (shouldLoadGame) {
    return (
      <LazyRouteErrorBoundary label="The game failed to load after an update.">
        <Suspense fallback={<PageLoadSpinner />}>
          <Game />
        </Suspense>
      </LazyRouteErrorBoundary>
    );
  }

  // Show start screen - this doesn't load Game component
  return <StartScreen />;
}
