import { logger } from "@/lib/logger";
import { isDemoEdition, isLocalOnlyEdition, isSteamBuild } from "@/lib/edition";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { mountNotoSansSymbols2FontFace } from "@/lib/notoSansSymbols2FontFace";
import { processStripePaymentReturn } from "@/lib/stripePaymentReturn";
import { syncSocialPromoExclusiveRewardPending } from "@/game/socialPromoExclusiveReward";
import { isDemoLimitReachedFromState } from "@/game/demoLimit";
import { applySaveBoost, canApplySaveBoost } from "@/game/boost";
import { getTransientDialogResetOnLoad } from "@/game/stateHelpers";
import { StateManager, useGameStore } from "@/game/state";
import { startGameLoop } from "@/game/loop";
import { saveGame } from "@/game/save";
import {
  flushPendingMarketingPreferences,
  getCurrentUser,
  syncStoreAuthFromSession,
} from "@/game/auth";
import { parseStartupIntent, type StartupLocation } from "@/game/startupIntent";
import {
  applyStartupUrlCleanup,
  consumeStartupAuthCallback,
} from "@/game/startupUrlCleanup";
import { consumePreparedGameHydration } from "@/game/startupGameLoader";
import { rehydratePurchasesOnStartup } from "@/game/shopPurchases";
import { mountFiraSansFontFace } from "@/lib/firaSansFontFace";
import { reportUtmLanding } from "@/lib/utmLanding";
import { hasUtmAttribution } from "@shared/utmAttribution";

export interface GameplayInitResult {
  hadPersistedSave: boolean;
  showEmailConfirmedDialog: boolean;
  openShop: boolean;
  cruelShopHighlight: boolean;
}

/**
 * Ordered gameplay bootstrap. Mutates the store and starts the loop.
 * React pages should only apply the returned UI flags.
 */
export async function runGameplayInitialization(
  location: StartupLocation = window.location,
): Promise<GameplayInitResult> {
  const gameplayLocalesPromise = ensureGameplayLocalesLoaded();
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await gameplayLocalesPromise;

  const intent = parseStartupIntent(location);
  if (intent.oauthCallback) {
    logger.log("[GAME] OAuth callback detected, processing authentication");
  }
  if (intent.emailConfirmed) {
    logger.log("[GAME] Email confirmation callback detected");
  }

  // Before any campaign URL strip: anonymous landing beacon (once per tab).
  reportUtmLanding(location, intent.utmAttribution);

  await consumeStartupAuthCallback(location);
  applyStartupUrlCleanup(location, ["auth-callback", "email-confirmed"]);

  const user = isLocalOnlyEdition() ? null : await getCurrentUser();
  if (user) {
    logger.log("[GAME] User authenticated, loading game");
    await syncStoreAuthFromSession();
    await flushPendingMarketingPreferences();
  }

  // Upgrade start-screen 400/500 mount to the full in-game weight set.
  // Load in parallel with save/audio; await before the loop so GameContainer
  // does not paint on the fallback face and then jump when Fira swaps in.
  const firaReady = mountFiraSansFontFace({
    stage: "game",
    applyFontLoadedClass: true,
  });
  mountNotoSansSymbols2FontFace();

  const preparedHydration = consumePreparedGameHydration();
  // Light Fire already flipped gameStarted on this store. Reloading a missing
  // save would reset to a fresh new-game blob and remount the start screen.
  const alreadyStarted = useGameStore.getState().flags.gameStarted === true;
  const hadPersistedSave =
    preparedHydration?.hadPersistedSave ??
    (alreadyStarted
      ? false
      : await useGameStore.getState().loadGame());

  // loadGame syncs auth; keep a confirmed session sticky across guest saves.
  if (user) {
    await syncStoreAuthFromSession();
  }

  const hydratedState = useGameStore.getState();
  const shouldTrackGoogleAds =
    Boolean(intent.googleAdsSource) && !hydratedState.googleAdsSource;
  const shouldTrackUtm =
    hasUtmAttribution(intent.utmAttribution) &&
    !hasUtmAttribution(hydratedState.utmAttribution);

  useGameStore.setState({
    ...(shouldTrackGoogleAds
      ? { googleAdsSource: intent.googleAdsSource ?? undefined }
      : {}),
    ...(shouldTrackUtm
      ? { utmAttribution: intent.utmAttribution ?? undefined }
      : {}),
    flags: {
      ...hydratedState.flags,
      ...(intent.forceGame
        ? {
          gameStarted: true,
          hasLitFire: true,
          villagerCapsEnabled: true,
        }
        : {}),
    },
    ...getTransientDialogResetOnLoad(),
  });

  if (shouldTrackGoogleAds || shouldTrackUtm) {
    if (shouldTrackGoogleAds) {
      logger.log(`[GAME] Tracking Google Ads source: ${intent.googleAdsSource}`);
    }
    if (shouldTrackUtm) {
      logger.log(
        `[GAME] Tracking UTM attribution: ${intent.utmAttribution?.source ?? ""}/${intent.utmAttribution?.campaign ?? ""}`,
      );
    }
    try {
      await saveGame(useGameStore.getState(), false);
      logger.log("[GAME] Successfully saved campaign attribution");
    } catch (error) {
      logger.error("[GAME] Failed to save campaign attribution:", error);
    }
  }

  if (hadPersistedSave) {
    logger.log("[GAME] Game loaded from save");
    syncSocialPromoExclusiveRewardPending();

    const currentState = useGameStore.getState();
    if (
      user &&
      currentState.referrals?.some((referral) => referral.claimed)
    ) {
      logger.log("[GAME] Detected claimed referrals - saving to cloud");
      try {
        await saveGame(useGameStore.getState(), false);
        logger.log("[GAME] Successfully saved claimed referrals to cloud");
      } catch (error) {
        logger.error("[GAME] Failed to save claimed referrals:", error);
      }
    }
  } else {
    logger.log("[GAME] Game initialized with defaults");
  }

  if (!isLocalOnlyEdition()) {
    await rehydratePurchasesOnStartup({
      paymentReturn: intent.paymentReturn,
      skipIfPaymentReturn: true,
    });
    await processStripePaymentReturn();
  }

  if (intent.boost) {
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
  }

  applyStartupUrlCleanup(location, [
    "campaign",
    "shop",
    ...(intent.boost ? (["boost-path"] as const) : []),
  ]);

  const { audioManager } = await import("@/lib/audio");
  const currentState = useGameStore.getState();
  audioManager.setMusicVolume(currentState.musicVolume ?? 1);
  audioManager.setSfxVolume(currentState.sfxVolume ?? 1);
  audioManager.musicMute(currentState.musicMuted);
  audioManager.sfxMute(currentState.sfxMuted);

  if (currentState.flags.gameStarted || intent.forceGame) {
    await audioManager.loadGameSounds();
    if (!currentState.musicMuted) {
      await audioManager.startBackgroundMusic();
    }
  }

  if (isDemoEdition()) {
    const loadedState = useGameStore.getState();
    if (isDemoLimitReachedFromState(loadedState)) {
      useGameStore.setState({ galaxyTimeUpDialogOpen: true });
    }
  }

  await firaReady;
  startGameLoop();

  if (isSteamBuild) {
    void import("@/achievements/steamAchievements").then(
      ({ syncSteamAchievements }) =>
        syncSteamAchievements(useGameStore.getState()),
    );
  }

  return {
    hadPersistedSave,
    showEmailConfirmedDialog:
      intent.emailConfirmed && !isLocalOnlyEdition(),
    openShop: intent.openShop,
    cruelShopHighlight: intent.cruelShopHighlight,
  };
}