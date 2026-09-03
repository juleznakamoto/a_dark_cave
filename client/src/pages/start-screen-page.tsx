import { useCallback, useEffect, useRef, useState, Suspense, lazy } from "react";
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
import {
  MAKE_FIRE_HANDOFF_SPINNER_DELAY_MS,
  shouldHoldMakeFireFrame,
} from "@/game/makeFireHandoff";
import { isLocalOnlyEdition } from "@/lib/edition";
import { initSessionTracker } from "@/lib/sessionTracker";
import { Z_INDEX } from "@/lib/z-index";
import SteamDemoContinueDialog from "@/components/game/SteamDemoContinueDialog";
import type { SaveData } from "@shared/schema";

const Game = lazy(() => import("@/pages/game"));

/**
 * Standalone start screen page that doesn't load the heavy Game component.
 * Paints immediately. Loads Game after "Make Fire", or prefetches it after
 * LCP plus the first pointer / key move.
 */
export default function StartScreenPage() {
  const [shouldLoadGame, setShouldLoadGame] = useState(false);
  const [fromMakeFire, setFromMakeFire] = useState(false);
  const [gameReadyToPaint, setGameReadyToPaint] = useState(false);
  const [spinnerDelayElapsed, setSpinnerDelayElapsed] = useState(false);
  const [startResolution, setStartResolution] = useState<
    Extract<StartupResolution, { surface: "start" }>
  >(peekStartScreenResolution);
  const [demoContinueOpen, setDemoContinueOpen] = useState(false);
  const [demoContinueBusy, setDemoContinueBusy] = useState(false);
  const [demoContinueChecking, setDemoContinueChecking] = useState(true);
  const demoContinueCandidateRef = useRef<SaveData | null>(null);
  const demoContinueLeftoverRef = useRef<SaveData | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    const checkDemoContinue = async () => {
      try {
        const { peekSteamDemoContinueOffer } = await import(
          "@/game/steamDemoContinue"
        );
        const offer = await peekSteamDemoContinueOffer(window.location);
        if (cancelled) return;
        demoContinueCandidateRef.current = offer.candidate;
        demoContinueLeftoverRef.current = offer.leftoverFullCloud;
        setDemoContinueOpen(offer.offer);
      } catch (error) {
        logger.error("Failed to check Demo save:", error);
      } finally {
        if (!cancelled) setDemoContinueChecking(false);
      }
    };
    void checkDemoContinue();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMakeFireStart = (nextPreferences: StartScreenPreferences) => {
    prefetchGame(nextPreferences);
    void import("@/i18n/loadLocaleResources").then(
      ({ ensureGameplayLocalesLoaded }) => {
        void ensureGameplayLocalesLoaded();
      },
    );
  };

  const handleMakeFire = async (nextPreferences: StartScreenPreferences) => {
    try {
      const { commitMakeFireStart } = await prepareGame(nextPreferences);
      commitMakeFireStart(nextPreferences);
      setFromMakeFire(true);
      setShouldLoadGame(true);
    } catch (error) {
      preparedGameRef.current = null;
      logger.error("Failed to start game:", error);
    }
  };

  const handleDemoContinue = async () => {
    if (demoContinueBusy) return;
    setDemoContinueBusy(true);
    try {
      const candidate = demoContinueCandidateRef.current;
      if (candidate) {
        const { importSteamDemoSaveToFullGame } = await import(
          "@/game/steamDemoContinue"
        );
        await importSteamDemoSaveToFullGame(candidate);
      }
      const { resetPreparedGameHydration } = await import(
        "@/game/startupGameLoader"
      );
      resetPreparedGameHydration();
      preparedGameRef.current = null;
      const preferences = startResolution.preferences;
      const { commitMakeFireStart } = await prepareGame(preferences);
      commitMakeFireStart(preferences);
      setDemoContinueOpen(false);
      setFromMakeFire(true);
      setShouldLoadGame(true);
    } catch (error) {
      preparedGameRef.current = null;
      setDemoContinueBusy(false);
      logger.error("Failed to continue Demo save:", error);
    }
  };

  const handleDemoStartNew = async () => {
    if (demoContinueBusy) return;
    setDemoContinueBusy(true);
    try {
      const { declineSteamDemoContinue } = await import(
        "@/game/steamDemoContinue"
      );
      await declineSteamDemoContinue(demoContinueLeftoverRef.current, {
        persistDecision: Boolean(
          demoContinueCandidateRef.current ||
          demoContinueLeftoverRef.current,
        ),
      });
      setDemoContinueOpen(false);
    } catch (error) {
      logger.error("Failed to decline Demo save:", error);
    } finally {
      setDemoContinueBusy(false);
    }
  };

  const handleGameReadyToPaint = useCallback(() => {
    setGameReadyToPaint(true);
  }, []);

  const holdMakeFireFrame = shouldHoldMakeFireFrame({
    fromMakeFire,
    gameReadyToPaint,
    spinnerDelayElapsed,
  });

  useEffect(() => {
    if (!fromMakeFire || !shouldLoadGame || gameReadyToPaint) return;
    const timer = window.setTimeout(() => {
      setSpinnerDelayElapsed(true);
    }, MAKE_FIRE_HANDOFF_SPINNER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [fromMakeFire, shouldLoadGame, gameReadyToPaint]);

  const showStartScreen = !shouldLoadGame || holdMakeFireFrame;

  return (
    <>
      {shouldLoadGame ? (
        <AppErrorBoundary>
          <Suspense fallback={holdMakeFireFrame ? null : <PageLoadSpinner />}>
            <Game
              suppressLoadingSpinner={holdMakeFireFrame}
              onReadyToPaint={handleGameReadyToPaint}
            />
          </Suspense>
        </AppErrorBoundary>
      ) : null}
      {showStartScreen ? (
        <div
          className={`fixed inset-0${holdMakeFireFrame ? " pointer-events-none" : ""}`}
          style={holdMakeFireFrame ? { zIndex: Z_INDEX.topLayer } : undefined}
          aria-hidden={holdMakeFireFrame || undefined}
          data-testid={holdMakeFireFrame ? "make-fire-handoff-frame" : undefined}
        >
          <StartScreen
            initialPreferences={startResolution.preferences}
            steamEditionActive={startResolution.steamEditionActive}
            steamDesktopEditionActive={
              startResolution.steamDesktopEditionActive
            }
            crazyGamesEditionActive={startResolution.crazyGamesEditionActive}
            hideSteamStoreLink={startResolution.hideSteamStoreLink}
            makeFireDisabled={demoContinueChecking || demoContinueOpen}
            onPlayerActivity={
              demoContinueChecking || demoContinueOpen
                ? undefined
                : prefetchGame
            }
            onMakeFireStart={handleMakeFireStart}
            onMakeFire={handleMakeFire}
          />
          <SteamDemoContinueDialog
            isOpen={demoContinueOpen}
            busy={demoContinueBusy}
            onContinue={() => void handleDemoContinue()}
            onStartNew={() => void handleDemoStartNew()}
          />
        </div>
      ) : null}
    </>
  );
}
