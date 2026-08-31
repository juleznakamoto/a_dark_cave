import { useEffect, useRef, useState, Suspense, lazy } from "react";
import StartScreen, {
  type StartScreenPreferences,
} from "@/components/game/StartScreen";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import PageLoadSpinner from "@/components/ui/page-load-spinner";
import { logger } from "@/lib/logger";
import {
  peekStartScreenResolution,
  resolveStartupVisit,
  type StartupResolution,
} from "@/game/startupCoordinator";
import {
  applyStartupUrlCleanup,
  consumeStartupAuthCallback,
} from "@/game/startupUrlCleanup";
import { isLocalOnlyEdition } from "@/lib/edition";
import { initSessionTracker } from "@/lib/sessionTracker";

const Game = lazy(() => import("@/pages/game"));

/**
 * Standalone start screen page that doesn't load the heavy Game component.
 * Paints immediately. Loads Game after "Make Fire", or prefetches it after
 * LCP plus the first pointer / key move.
 */
export default function StartScreenPage() {
  const [shouldLoadGame, setShouldLoadGame] = useState(false);
  const [startResolution, setStartResolution] = useState<
    Extract<StartupResolution, { surface: "start" }>
  >(peekStartScreenResolution);
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

  const prefetchGame = (nextPreferences: StartScreenPreferences) => {
    void import("@/pages/game");
    void prepareGame(nextPreferences).catch((error) => {
      preparedGameRef.current = null;
      logger.error("Failed to prefetch game:", error);
    });
  };

  useEffect(() => {
    const checkGameState = async () => {
      try {
        if (!isLocalOnlyEdition()) {
          initSessionTracker();
        }
        const landingLocation = {
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
        };
        void import("@/lib/utmLanding").then(({ reportUtmLanding }) => {
          reportUtmLanding(landingLocation);
        });
        await consumeStartupAuthCallback(window.location);
        applyStartupUrlCleanup(window.location, ["hard-reload-bust", "referral"]);

        const resolution = await resolveStartupVisit(window.location);
        if (resolution.surface === "game") {
          setShouldLoadGame(true);
        } else {
          setStartResolution(resolution);
        }
      } catch (error) {
        // Title is already painted. Persist failures surface on Make Fire.
        logger.error("Failed to check saved game state:", error);
      }
    };

    void checkGameState();
  }, []);

  const handleMakeFireStart = (nextPreferences: StartScreenPreferences) => {
    prefetchGame(nextPreferences);
  };

  const handleMakeFire = async (nextPreferences: StartScreenPreferences) => {
    try {
      const { commitMakeFireStart } = await prepareGame(nextPreferences);
      commitMakeFireStart(nextPreferences);
      setShouldLoadGame(true);
    } catch (error) {
      preparedGameRef.current = null;
      logger.error("Failed to start game:", error);
    }
  };

  if (shouldLoadGame) {
    return (
      <AppErrorBoundary>
        <Suspense fallback={<PageLoadSpinner />}>
          <Game />
        </Suspense>
      </AppErrorBoundary>
    );
  }

  return (
    <StartScreen
      initialPreferences={startResolution.preferences}
      steamEditionActive={startResolution.steamEditionActive}
      steamDesktopEditionActive={
        startResolution.steamDesktopEditionActive
      }
      crazyGamesEditionActive={startResolution.crazyGamesEditionActive}
      hideSteamStoreLink={startResolution.hideSteamStoreLink}
      onPlayerActivity={prefetchGame}
      onMakeFireStart={handleMakeFireStart}
      onMakeFire={handleMakeFire}
    />
  );
}
