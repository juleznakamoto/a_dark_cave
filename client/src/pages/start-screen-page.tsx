import { useEffect, useRef, useState, Suspense, lazy } from "react";
import StartScreen, {
  type StartScreenPreferences,
} from "@/components/game/StartScreen";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import PageLoadSpinner from "@/components/ui/page-load-spinner";
import { HARD_RELOAD_CACHE_BUST_PARAM } from "@/lib/hardReload";
import { logger } from "@/lib/logger";
import {
  isGalaxyEdition,
  isSteamBuild,
  type DevGameMode,
} from "@/lib/edition";
import {
  readStartupSaveHeader,
  type StartupSaveHeader,
} from "@/game/startupSaveHeader";

// Lazy load Game component - only loaded when needed
const Game = lazy(() => import("@/pages/game"));

const DEFAULT_START_SCREEN_PREFERENCES: StartScreenPreferences = {
  cruelMode: false,
  musicMuted: false,
  sfxMuted: false,
  musicVolume: 1,
  sfxVolume: 1,
};

function hasPersistedAuthSession(): boolean {
  try {
    const raw = localStorage.getItem("a-dark-cave-auth");
    if (!raw) return false;
    const session = JSON.parse(raw) as {
      access_token?: unknown;
      user?: unknown;
    } | null;
    return (
      typeof session?.access_token === "string" &&
      session.access_token.length > 0 &&
      session.user !== null &&
      typeof session.user === "object"
    );
  } catch {
    return false;
  }
}

function preferencesFromHeader(
  header: StartupSaveHeader | null,
): StartScreenPreferences {
  if (!header) return DEFAULT_START_SCREEN_PREFERENCES;
  return {
    cruelMode: header.cruelMode,
    musicMuted: header.musicMuted,
    sfxMuted: header.sfxMuted,
    musicVolume: header.musicVolume,
    sfxVolume: header.sfxVolume,
  };
}

function getEditionFlags(devGameMode: DevGameMode) {
  const devSteamMode =
    import.meta.env.DEV && !isSteamBuild && devGameMode !== "normal";
  return {
    steamEditionActive: isSteamBuild || isGalaxyEdition() || devSteamMode,
    steamDesktopEditionActive: isSteamBuild || devSteamMode,
  };
}

/**
 * Standalone start screen page that doesn't load the heavy Game component.
 * Only loads Game after user clicks "Light Fire".
 */
export default function StartScreenPage() {
  const [shouldLoadGame, setShouldLoadGame] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [preferences, setPreferences] = useState(
    DEFAULT_START_SCREEN_PREFERENCES,
  );
  const [devGameMode, setDevGameMode] = useState<DevGameMode>("normal");
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

      try {
        const header = await readStartupSaveHeader();
        setPreferences(preferencesFromHeader(header));
        setDevGameMode(header?.devGameMode ?? "normal");

        if (header?.gameStarted) {
          setShouldLoadGame(true);
          return;
        }

        // A Steam Cloud save or a signed-in cloud-only save cannot be detected
        // from local IndexedDB. Preserve the full reconciliation path for those
        // users while keeping anonymous first visits on the lightweight path.
        if (isSteamBuild || hasPersistedAuthSession()) {
          const useGameStore = await Promise.race([
            import("@/game/startupGameLoader").then(
              ({ loadStoreForStartupCheck }) => loadStoreForStartupCheck(),
            ),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("loadGame timeout")), 15000),
            ),
          ]);
          const state = useGameStore.getState();
          if (state.flags.gameStarted) {
            setShouldLoadGame(true);
            return;
          }
          setPreferences({
            cruelMode: state.cruelMode,
            musicMuted: state.musicMuted,
            sfxMuted: state.sfxMuted,
            musicVolume: state.musicVolume,
            sfxVolume: state.sfxVolume,
          });
          setDevGameMode(state.devGameMode);
        }
      } catch (error) {
        logger.error("Failed to check saved game state:", error);
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
      const { useGameStore, startGameLoop } =
        await prepareGame(nextPreferences);
      useGameStore.setState(nextPreferences);
      useGameStore.getState().trackButtonClick("light-fire");
      startGameLoop();
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
  const editionFlags = getEditionFlags(devGameMode);
  return (
    <StartScreen
      initialPreferences={preferences}
      {...editionFlags}
      onLightFireStart={handleLightFireStart}
      onLightFire={handleLightFire}
    />
  );
}
