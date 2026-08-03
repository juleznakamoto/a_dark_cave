import { useEffect, useState } from "react";
import { lazy } from "react";
import GameContainer from "@/components/game/GameContainer";
import { StateManager, useGameStore } from "@/game/state";
import { startGameLoop, stopGameLoop } from "@/game/loop";
import { saveGame } from "@/game/save";
const EmailConfirmedDialog = lazy(() => import("@/components/game/EmailConfirmedDialog"));
const PlaylightWelcomeDialog = lazy(() => import("@/components/game/PlaylightWelcomeDialog"));
const FeedbackDialog = lazy(() => import("@/components/game/FeedbackDialog"));
import { logger } from "@/lib/logger";
import { getCurrentUser, flushPendingMarketingPreferences } from "@/game/auth";
import { initSessionTracker } from "@/lib/sessionTracker";
import { getTransientDialogResetOnLoad } from "@/game/stateHelpers";
import { syncSocialPromoExclusiveRewardPending } from "@/game/socialPromoExclusiveReward";
import { processStripePaymentReturn } from "@/lib/stripePaymentReturn";
import { isLocalOnlyEdition, isDemoEdition, isSteamBuild } from "@/lib/edition";
import { useSteamEditionActive } from "@/hooks/useSteamEditionActive";
import { mountNotoSansSymbols2FontFace } from "@/lib/notoSansSymbols2FontFace";
import { isDemoLimitReachedFromState } from "@/game/demoLimit";
import {
  applySaveBoost,
  canApplySaveBoost,
} from "@/game/boost";
import PageLoadSpinner from "@/components/ui/page-load-spinner";
import PageErrorScreen from "@/components/ui/page-error-screen";
import { clearStaleChunkReloadGuard } from "@/lib/hardReload";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { parseStartupIntent } from "@/game/startupIntent";
import { consumePreparedGameHydration } from "@/game/startupGameLoader";

export default function Game() {
  const { setShopDialogOpen, setIsUserSignedIn } = useGameStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(false);
  const [emailConfirmedDialogOpen, setEmailConfirmedDialogOpen] = useState(false);
  const steamEditionActive = useSteamEditionActive();

  // Game chunk mounted — allow a future deploy's one-shot chunk retry again.
  useEffect(() => {
    clearStaleChunkReloadGuard();
  }, []);

  useEffect(() => {
    logger.log("[GAME PAGE] Initializing game");
    // Session tracking is anonymous online analytics — web only.
    if (!isLocalOnlyEdition()) {
      initSessionTracker();
    }
    // Playlight is web-only and only needed in gameplay (not the start screen).
    if (!isLocalOnlyEdition()) {
      void import("@/lib/playlight")
        .then(({ initPlaylight }) => initPlaylight())
        .catch(() => { });
    }
    const initializeGame = async () => {
      try {
        const gameplayLocalesPromise = ensureGameplayLocalesLoaded();

        // Wait for first paint
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await gameplayLocalesPromise;

        const intent = parseStartupIntent(window.location);
        const searchParams = new URLSearchParams(window.location.search);
        const accessToken = intent.accessToken;
        const isEmailConfirmed = intent.emailConfirmed;

        if (accessToken) {
          logger.log(
            "[GAME PAGE] OAuth callback detected, processing authentication",
          );
          // Clear the URL hash/params after reading
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        }

        // Clean up email_confirmed param from URL
        if (isEmailConfirmed) {
          logger.log("[GAME PAGE] Email confirmation callback detected");
          searchParams.delete("email_confirmed");
          const newUrl = window.location.pathname +
            (searchParams.toString() ? `?${searchParams.toString()}` : "") +
            window.location.hash;
          window.history.replaceState({}, document.title, newUrl);
        }

        // Check if user just signed in with OAuth (web only; Steam build is offline).
        const user = isLocalOnlyEdition() ? null : await getCurrentUser();
        if (user) {
          logger.log("[GAME PAGE] User authenticated, loading game");
          setIsUserSignedIn(true);
          await flushPendingMarketingPreferences();
        }

        const isBoostPath = intent.boost;
        const isGamePath = intent.forceGame;
        const openShop = intent.openShop;
        const cruelShopHighlight = intent.cruelShopHighlight;
        const googleAdsSource = intent.googleAdsSource;

        // Load Inter font immediately when game loads (not conditionally)
        const loadInterFont = () => {
          if (!document.getElementById('inter-font-face')) {
            const style = document.createElement('style');
            style.id = 'inter-font-face';
            style.textContent = `
              @font-face {
                font-family: 'Inter';
                src: url('/fonts/inter.woff2') format('woff2');
                font-weight: 100 900;
                font-style: normal;
                font-display: swap;
              }
            `;
            document.head.appendChild(style);
          }

          // Use FontFace API to detect when font is loaded and apply immediately
          if ('fonts' in document) {
            const interFont = new FontFace('Inter', 'url(/fonts/inter.woff2)', {
              weight: '100 900',
              style: 'normal',
              display: 'swap',
            });

            interFont.load().then(() => {
              document.fonts.add(interFont);
              // Apply Inter immediately when loaded
              document.documentElement.classList.add('font-loaded');
            }).catch(() => {
              // Fallback: add class anyway after a short delay
              setTimeout(() => {
                document.documentElement.classList.add('font-loaded');
              }, 100);
            });
          } else {
            // Fallback for browsers without FontFace API - add class immediately
            document.documentElement.classList.add('font-loaded');
          }
        };

        // Load Inter font immediately when game component mounts
        loadInterFont();

        // Symbol fallback font (same-origin @font-face; avoids Playlight reading cross-origin CSS rules).
        mountNotoSansSymbols2FontFace();

        // The start page may already have hydrated the store while checking a
        // cloud/Steam save or preparing Light Fire. Consume that handoff rather
        // than reading and applying the same save a second time.
        const preparedHydration = consumePreparedGameHydration();
        const hadPersistedSave =
          preparedHydration?.hadPersistedSave ??
          (await useGameStore.getState().loadGame());

        const hydratedState = useGameStore.getState();
        const shouldTrackGoogleAds =
          Boolean(googleAdsSource) && !hydratedState.googleAdsSource;

        useGameStore.setState({
          ...(shouldTrackGoogleAds
            ? { googleAdsSource: googleAdsSource ?? undefined }
            : {}),
          isUserSignedIn: hydratedState.isUserSignedIn || !!user,
          flags: {
            ...hydratedState.flags,
            ...(isGamePath
              ? {
                gameStarted: true,
                hasLitFire: true,
                villagerCapsEnabled: true,
              }
              : {}),
          },
          ...getTransientDialogResetOnLoad(),
        });

        if (shouldTrackGoogleAds) {
          logger.log(`[GAME] Tracking Google Ads source: ${googleAdsSource}`);
          setTimeout(async () => {
            try {
              await saveGame(useGameStore.getState(), false);
              logger.log("[GAME] Successfully saved Google Ads source");
            } catch (error) {
              logger.error("[GAME] Failed to save Google Ads source:", error);
            }
          }, 500);
        }

        if (hadPersistedSave) {
          logger.log("[GAME] Game loaded from save");
          syncSocialPromoExclusiveRewardPending();

          const currentState = useGameStore.getState();
          if (
            user &&
            currentState.referrals &&
            currentState.referrals.some((referral) => referral.claimed)
          ) {
            logger.log("[GAME] Detected claimed referrals - saving to cloud");
            setTimeout(async () => {
              try {
                await saveGame(useGameStore.getState(), false);
                logger.log(
                  "[GAME] Successfully saved claimed referrals to cloud",
                );
              } catch (error) {
                logger.error("[GAME] Failed to save claimed referrals:", error);
              }
            }, 1000);
          }
        } else {
          logger.log("[GAME] Game initialized with defaults");
        }

        // Guest/local saves persist isUserSignedIn:false. Hydrating that after
        // OAuth (or any confirmed session) would clear the live auth flag and
        // leave rewards Sign Up claim eligibility stuck off — re-sync from the
        // session we already resolved above.
        if (user) {
          setIsUserSignedIn(true);
        }

        // Online entitlement/payment flows are web only. The Steam build grants
        // the full game locally (see createInitialState) and has no shop.
        if (!isLocalOnlyEdition()) {
          const { rehydratePurchasesFromSupabase } = await import(
            "@/game/shopPurchases"
          );
          await rehydratePurchasesFromSupabase();

          await processStripePaymentReturn();
        }

        // Remove Google Ads source parameter from URL if it was present
        if (googleAdsSource) {
          const adsParams = new URLSearchParams(window.location.search);
          adsParams.delete("c");
          adsParams.delete("src");
          const newUrl = window.location.pathname +
            (adsParams.toString() ? `?${adsParams.toString()}` : "") +
            window.location.hash;
          window.history.replaceState({}, document.title, newUrl);
          logger.log("[GAME] Removed Google Ads source parameter from URL");
        }

        if (openShop || cruelShopHighlight) {
          const shopParams = new URLSearchParams(window.location.search);
          if (openShop) shopParams.delete("openShop");
          if (cruelShopHighlight) shopParams.delete("cruelHighlight");
          const newShopUrl =
            window.location.pathname +
            (shopParams.toString() ? `?${shopParams.toString()}` : "") +
            window.location.hash;
          window.history.replaceState({}, document.title, newShopUrl);
        }

        if (isBoostPath) {
          const boostState = useGameStore.getState();
          if (canApplySaveBoost(boostState)) {
            const { resources, logEntry } = applySaveBoost(boostState);
            useGameStore.setState({
              resources,
              boostApplied: true,
            });
            useGameStore.getState().addLogEntry(logEntry);
            StateManager.scheduleEffectsUpdate(useGameStore.getState);
            try {
              await saveGame(useGameStore.getState(), false);
              logger.log("[GAME] One-time /boost bonus applied and saved");
            } catch (error) {
              logger.error("[GAME] Failed to save after /boost bonus:", error);
            }
          }
          window.history.replaceState({}, document.title, "/");
        }

        // Mark as initialized
        setIsInitialized(true);

        // Sync audio mute state immediately (before starting game loop)
        // Note: audioManager may already be initialized for start screen wind sound
        const { audioManager } = await import("@/lib/audio");
        const currentState = useGameStore.getState();
        audioManager.setMusicVolume(currentState.musicVolume ?? 1);
        audioManager.setSfxVolume(currentState.sfxVolume ?? 1);
        audioManager.musicMute(currentState.musicMuted);
        audioManager.sfxMute(currentState.sfxMuted);

        // Only load game sounds if the game has actually started (not showing start screen)
        // This prevents loading large audio files before user interaction
        if (currentState.flags.gameStarted || isGamePath) {
          await audioManager.loadGameSounds();
          // Start background music after sounds are loaded (handles page reload case)
          // startBackgroundMusic sets the volume and respects the mute state internally
          if (!currentState.musicMuted) {
            await audioManager.startBackgroundMusic();
          }
        }

        // Start game loop
        if (isDemoEdition()) {
          const loadedState = useGameStore.getState();
          if (isDemoLimitReachedFromState(loadedState)) {
            useGameStore.setState({ galaxyTimeUpDialogOpen: true });
          }
        }

        startGameLoop();

        // Steam build: backfill Steam achievements for progress already earned.
        if (isSteamBuild) {
          void import("@/achievements/steamAchievements").then(
            ({ syncSteamAchievements }) =>
              syncSteamAchievements(useGameStore.getState()),
          );
        }

        // Open shop if requested (after a delay to ensure game is loaded)
        if (openShop) {
          setTimeout(() => {
            if (cruelShopHighlight) {
              useGameStore.getState().setShopCruelModeHighlight(true);
            }
            setShopDialogOpen(true, "url");
          }, 500);
        }

        // Show email confirmed dialog after game is loaded (web auth only)
        if (isEmailConfirmed && !isLocalOnlyEdition()) {
          setTimeout(() => {
            setEmailConfirmedDialogOpen(true);
          }, 500);
        }
      } catch (error) {
        logger.error("[GAME PAGE] Failed to initialize game:", error);
        setInitError(true);
      }
    };

    initializeGame();

    // Cleanup function to stop the game loop when the component unmounts
    return () => {
      stopGameLoop();
    };
  }, []); // Empty dependency array - only run once on mount

  if (initError) {
    return <PageErrorScreen />;
  }

  if (!isInitialized) {
    return <PageLoadSpinner />;
  }

  return (
    <div>
      <GameContainer />

      {!steamEditionActive && (
        <>
          <EmailConfirmedDialog
            isOpen={emailConfirmedDialogOpen}
            onClose={() => setEmailConfirmedDialogOpen(false)}
          />

          <PlaylightWelcomeDialog />

          <FeedbackDialog />
        </>
      )}
    </div>
  );
}
