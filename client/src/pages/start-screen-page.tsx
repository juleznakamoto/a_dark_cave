import { useEffect, useRef, useState, Suspense, lazy } from "react";
import StartScreen, {
  type StartScreenPreferences,
} from "@/components/game/StartScreen";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import PageLoadSpinner from "@/components/ui/page-load-spinner";
import PageErrorScreen from "@/components/ui/page-error-screen";
import { HARD_RELOAD_CACHE_BUST_PARAM } from "@/lib/hardReload";
import { logger } from "@/lib/logger";
import {
  resolveStartupVisit,
  type StartupResolution,
} from "@/game/startupCoordinator";

// Lazy load Game component - only loaded when needed
const Game = lazy(() => import("@/pages/game"));

/**
 * Standalone start screen page that doesn't load the heavy Game component.
 * Only loads Game after user clicks "Light Fire".
 */
export default function StartScreenPage() {
  const [shouldLoadGame, setShouldLoadGame] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [startupError, setStartupError] = useState<unknown>(null);
  const [startResolution, setStartResolution] = useState<
    Extract<StartupResolution, { surface: "start" }> | null
  >(null);
  const preparedGameRef = useRef<
    ReturnType<
      typeof import("@/game/startupGameLoader").prepareGameFromStartScreen
    > | null
  >(null);

  const prepareGame = (nextPreferences: StartScreenPreferences) => {
    if (!preparedGameRef.current) {
      preparedGameRef.current = import("@/game/startupGameLoader").then(
        ({ prepareGameFromStartScreen }) =>
          prepareGameFromStartScreen(nextPreferences),
      );
    }
    return preparedGameRef.current;
  };

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
      try {
        const resolution = await resolveStartupVisit(window.location);
        if (resolution.surface === "game") {
          setShouldLoadGame(true);
        } else {
          setStartResolution(resolution);
        }
      } catch (error) {
        logger.error("Failed to check saved game state:", error);
        setStartupError(error);
      } finally {
        setIsChecking(false);
      }
    };

    checkGameState();
  }, []);

  const handleLightFireStart = (nextPreferences: StartScreenPreferences) => {
    void prepareGame(nextPreferences).catch((error) => {
      preparedGameRef.current = null;
      logger.error("Failed to prepare game:", error);
    });
  };

  const handleLightFire = async (nextPreferences: StartScreenPreferences) => {
    try {
      const { useGameStore } = await prepareGame(nextPreferences);
      useGameStore.setState(nextPreferences);
      useGameStore.getState().trackButtonClick("light-fire");
      useGameStore.getState().executeAction("lightFire");
      setShouldLoadGame(true);
    } catch (error) {
      preparedGameRef.current = null;
      logger.error("Failed to start game:", error);
    }
  };

  // Show loading state while checking
  if (isChecking) {
    return <PageLoadSpinner />;
  }

  if (startupError) {
    return <PageErrorScreen reason={startupError} />;
  }

  // Dynamically load Game component only when needed
  if (shouldLoadGame) {
    return (
      <AppErrorBoundary>
        <Suspense fallback={<PageLoadSpinner />}>
          <Game />
        </Suspense>
      </AppErrorBoundary>
    );
  }

  // Show start screen - this doesn't load Game component
  if (!startResolution) {
    return <PageLoadSpinner />;
  }

  return (
    <StartScreen
      initialPreferences={startResolution.preferences}
      steamEditionActive={startResolution.steamEditionActive}
      steamDesktopEditionActive={
        startResolution.steamDesktopEditionActive
      }
      onLightFireStart={handleLightFireStart}
      onLightFire={handleLightFire}
    />
  );
}
