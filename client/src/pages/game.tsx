import { useEffect, useLayoutEffect, useRef, useState, lazy, Suspense } from "react";
import GameContainer from "@/components/game/GameContainer";
import { useGameStore } from "@/game/state";
import { stopGameLoop } from "@/game/loop";
import { logger } from "@/lib/logger";
import { initSessionTracker } from "@/lib/sessionTracker";
import { isLocalOnlyEdition } from "@/lib/edition";
import { useSteamEditionActive } from "@/hooks/useSteamEditionActive";
import PageLoadSpinner from "@/components/ui/page-load-spinner";
import PageErrorScreen from "@/components/ui/page-error-screen";
import { clearStaleChunkReloadGuard } from "@/lib/hardReload";
import { runGameplayInitialization } from "@/game/gameplayInitOrchestrator";

type GameProps = {
  /** Parent cover (Make Fire frame) can stay up until this fires. */
  onReadyToPaint?: () => void;
  /** Skip the page spinner so a parent title frame can remain visible. */
  suppressLoadingSpinner?: boolean;
};

const EmailConfirmedDialog = lazy(
  () => import("@/components/game/EmailConfirmedDialog"),
);
const PlaylightWelcomeDialog = lazy(
  () => import("@/components/game/PlaylightWelcomeDialog"),
);
const FeedbackDialog = lazy(() => import("@/components/game/FeedbackDialog"));

export default function Game({
  onReadyToPaint,
  suppressLoadingSpinner = false,
}: GameProps = {}) {
  const setShopDialogOpen = useGameStore((state) => state.setShopDialogOpen);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(false);
  const [emailConfirmedDialogOpen, setEmailConfirmedDialogOpen] =
    useState(false);
  const steamEditionActive = useSteamEditionActive();
  const onReadyToPaintRef = useRef(onReadyToPaint);
  onReadyToPaintRef.current = onReadyToPaint;

  useEffect(() => {
    clearStaleChunkReloadGuard();
  }, []);

  useEffect(() => {
    logger.log("[GAME PAGE] Initializing game");
    if (!isLocalOnlyEdition()) {
      initSessionTracker();
      void import("@/lib/playlight")
        .then(({ initPlaylight }) => initPlaylight())
        .catch(() => { });
    }

    let cancelled = false;
    void runGameplayInitialization(window.location)
      .then((result) => {
        if (cancelled) return;
        if (result.openShop) {
          if (result.cruelShopHighlight) {
            useGameStore.getState().setShopCruelModeHighlight(true);
          }
          setShopDialogOpen(true, "url");
        }
        if (result.showEmailConfirmedDialog) {
          setEmailConfirmedDialogOpen(true);
        }
        setIsInitialized(true);
        void result.background.catch((error) => {
          logger.error("[GAME PAGE] Background gameplay init failed:", error);
        });
      })
      .catch((error) => {
        logger.error("[GAME PAGE] Failed to initialize game:", error);
        if (!cancelled) setInitError(true);
      });

    return () => {
      cancelled = true;
      stopGameLoop();
    };
  }, [setShopDialogOpen]);

  useLayoutEffect(() => {
    if (isInitialized || initError) {
      onReadyToPaintRef.current?.();
    }
  }, [isInitialized, initError]);

  if (initError) {
    return <PageErrorScreen />;
  }

  if (!isInitialized) {
    return suppressLoadingSpinner ? null : <PageLoadSpinner />;
  }

  return (
    <div>
      <GameContainer />

      {!steamEditionActive && (
        <Suspense fallback={null}>
          <EmailConfirmedDialog
            isOpen={emailConfirmedDialogOpen}
            onClose={() => setEmailConfirmedDialogOpen(false)}
          />
          <PlaylightWelcomeDialog />
          <FeedbackDialog />
        </Suspense>
      )}
    </div>
  );
}
