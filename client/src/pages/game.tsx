import { useEffect, useState } from "react";
import { lazy } from "react";
import GameContainer from "@/components/game/GameContainer";
import { useGameStore } from "@/game/state";
import { startGameLoop, stopGameLoop } from "@/game/loop";
import { loadGame, saveGame } from "@/game/save"; // Import saveGame
const EventDialog = lazy(() => import("@/components/game/EventDialog"));
const EmailConfirmedDialog = lazy(() => import("@/components/game/EmailConfirmedDialog"));
const PlaylightWelcomeDialog = lazy(() => import("@/components/game/PlaylightWelcomeDialog"));
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/game/auth";
import { initSessionTracker } from "@/lib/sessionTracker";
import { gamblerDiceResumeOnLoad } from "@/game/gamblerSession";
import type { TimedEventTabState } from "@/game/types";

export default function Game() {
  const initialize = useGameStore((state) => state.initialize);
  const {
    eventDialog,
    setEventDialog,
    setShopDialogOpen,
  } = useGameStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [emailConfirmedDialogOpen, setEmailConfirmedDialogOpen] = useState(false);
  useEffect(() => {
    logger.log("[GAME PAGE] Initializing game");
    initSessionTracker();
    const initializeGame = async () => {
      try {
        // Wait for first paint
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        // Handle OAuth callback - check for tokens in URL
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1),
        );
        const searchParams = new URLSearchParams(window.location.search);
        const accessToken =
          hashParams.get("access_token") || searchParams.get("access_token");
        const isEmailConfirmed = searchParams.get("email_confirmed") === "true";

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

        // Check if user just signed in with OAuth
        const user = await getCurrentUser();
        if (user) {
          logger.log("[GAME PAGE] User authenticated, loading game");
        }

        // Parse URL query parameters
        const urlParams = new URLSearchParams(window.location.search);

        // Check if URL is /boost path or ?game=true param to skip start screen
        const isGamePath =
          window.location.pathname === "/boost" ||
          urlParams.get("game") === "true";

        // Check for openShop query parameter only (not /boost path)
        const openShop = urlParams.get("openShop") === "true";

        // Check for Google Ads source parameter (c)
        const googleAdsSource = urlParams.get("c");

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

        // Load symbol fallback font (covers game UI glyphs not in Inter).
        // Only add to CSS font stack once confirmed loaded to avoid FOUT.
        if (!document.getElementById('noto-symbols-font')) {
          const preconnect1 = document.createElement('link');
          preconnect1.rel = 'preconnect';
          preconnect1.href = 'https://fonts.googleapis.com';
          document.head.appendChild(preconnect1);

          const preconnect2 = document.createElement('link');
          preconnect2.rel = 'preconnect';
          preconnect2.href = 'https://fonts.gstatic.com';
          preconnect2.crossOrigin = 'anonymous';
          document.head.appendChild(preconnect2);

          const link = document.createElement('link');
          link.id = 'noto-symbols-font';
          link.rel = 'stylesheet';
          link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Symbols+2&display=swap';
          link.onload = () => document.documentElement.classList.add('symbols-font-loaded');
          link.onerror = () => { /* silent: symbols fall back to system fonts */ };
          document.head.appendChild(link);
        }

        // Load saved game or initialize with defaults
        const savedState = await loadGame();
        if (savedState) {
          // Track Google Ads source if present in URL and not already saved
          const stateUpdates: any = {};
          if (googleAdsSource && !savedState.googleAdsSource) {
            stateUpdates.googleAdsSource = googleAdsSource;
            logger.log(`[GAME] Tracking Google Ads source: ${googleAdsSource}`);
          }

          const timedEventTab =
            (savedState as { timedEventTab?: TimedEventTabState })
              .timedEventTab ?? {
              isActive: false,
              event: null,
              expiryTime: 0,
            };
          const resumeUi = gamblerDiceResumeOnLoad({
            timedEventTab,
            gamblerGame: savedState.gamblerGame,
          });

          // Gambler in-progress state is persisted in save data and resumed on load.
          useGameStore.setState({
            ...savedState,
            timedEventTab,
            ...stateUpdates,
            ...resumeUi,
            flags: {
              ...savedState.flags,
              gameStarted: isGamePath ? true : savedState.flags.gameStarted, // Force game started if /game path
              hasLitFire: isGamePath ? true : savedState.flags.hasLitFire, // Force fire lit if /game path
            },
          });
          logger.log("[GAME] Game loaded from save");

          // Save Google Ads source if it was set
          if (stateUpdates.googleAdsSource) {
            setTimeout(async () => {
              try {
                const { saveGame } = await import("@/game/save");
                await saveGame(useGameStore.getState(), false);
                logger.log("[GAME] Successfully saved Google Ads source");
              } catch (error) {
                logger.error("[GAME] Failed to save Google Ads source:", error);
              }
            }, 500);
          }

          // If user is logged in and has claimed referrals, save to cloud
          if (
            user &&
            savedState.referrals &&
            savedState.referrals.some((r) => r.claimed)
          ) {
            logger.log("[GAME] Detected claimed referrals - saving to cloud");
            // Use setTimeout to ensure state is fully set before saving
            setTimeout(async () => {
              try {
                await saveGame(savedState, false, false);
                logger.log(
                  "[GAME] Successfully saved claimed referrals to cloud",
                );
              } catch (error) {
                logger.error("[GAME] Failed to save claimed referrals:", error);
              }
            }, 1000);
          }
        } else {
          // If no saved state, initialize with defaults
          // Preserve flags/story already set by executeAction("lightFire") before Game mounted
          const preInitFlags = useGameStore.getState().flags;
          const preInitStory = useGameStore.getState().story;
          initialize();
          if (preInitFlags.gameStarted) {
            useGameStore.setState({
              flags: { ...useGameStore.getState().flags, gameStarted: true, hasLitFire: preInitFlags.hasLitFire },
              story: preInitStory,
            });
          }

          // Track Google Ads source if present in URL
          if (googleAdsSource) {
            useGameStore.setState({ googleAdsSource });
            logger.log(`[GAME] Tracking Google Ads source: ${googleAdsSource}`);

            // Save immediately
            setTimeout(async () => {
              try {
                const { saveGame } = await import("@/game/save");
                await saveGame(useGameStore.getState(), false);
                logger.log("[GAME] Successfully saved Google Ads source");
              } catch (error) {
                logger.error("[GAME] Failed to save Google Ads source:", error);
              }
            }, 500);
          }

          // If accessing /game directly, also set the game as started
          if (isGamePath) {
            useGameStore.setState({
              flags: {
                ...useGameStore.getState().flags,
                gameStarted: true,
                hasLitFire: true,
              },
            });
          }

          logger.log("[GAME] Game initialized with defaults");
        }

        // Remove Google Ads source parameter from URL if it was present
        if (googleAdsSource) {
          urlParams.delete("c");
          // Also remove src parameter if present (legacy)
          urlParams.delete("src");
          const newUrl = window.location.pathname +
            (urlParams.toString() ? `?${urlParams.toString()}` : "") +
            window.location.hash;
          window.history.replaceState({}, document.title, newUrl);
          logger.log("[GAME] Removed Google Ads source parameter from URL");
        }

        // Mark as initialized
        setIsInitialized(true);

        // Sync audio mute state immediately (before starting game loop)
        // Note: audioManager may already be initialized for start screen wind sound
        const { audioManager } = await import("@/lib/audio");
        const currentState = useGameStore.getState();
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
        startGameLoop();

        // Open shop if requested (after a delay to ensure game is loaded)
        if (openShop) {
          setTimeout(() => {
            setShopDialogOpen(true);
          }, 500);
        }

        // Show email confirmed dialog after game is loaded
        if (isEmailConfirmed) {
          setTimeout(() => {
            setEmailConfirmedDialogOpen(true);
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

      <EmailConfirmedDialog
        isOpen={emailConfirmedDialogOpen}
        onClose={() => setEmailConfirmedDialogOpen(false)}
      />

      <PlaylightWelcomeDialog />
    </div>
  );
}
