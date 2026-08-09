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

  await consumeStartupAuthCallback(location);
  applyStartupUrlCleanup(location, ["auth-callback", "email-confirmed"]);

  const user = isLocalOnlyEdition() ? null : await getCurrentUser();
  if (user) {
    logger.log("[GAME] User authenticated, loading game");
    await syncStoreAuthFromSession();
    await flushPendingMarketingPreferences();
  }

  // Upgrade start-screen 400/500 mount to the full in-game weight set.
  mountFiraSansFontFace({ stage: "game", applyFontLoadedClass: true });
  mountNotoSansSymbols2FontFace();

  const preparedHydration = consumePreparedGameHydration();
  const hadPersistedSave =
    preparedHydration?.hadPersistedSave ??
    (await useGameStore.getState().loadGame());

  // loadGame syncs auth; keep a confirmed session sticky across guest saves.
  if (user) {
    await syncStoreAuthFromSession();
  }

  const hydratedState = useGameStore.getState();
  const shouldTrackGoogleAds =
    Boolean(intent.googleAdsSource) && !hydratedState.googleAdsSource;

  useGameStore.setState({
    ...(shouldTrackGoogleAds
      ? { googleAdsSource: intent.googleAdsSource ?? undefined }
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

  if (shouldTrackGoogleAds) {
    logger.log(`[GAME] Tracking Google Ads source: ${intent.googleAdsSource}`);
    try {
      await saveGame(useGameStore.getState(), false);
      logger.log("[GAME] Successfully saved Google Ads source");
    } catch (error) {
      logger.error("[GAME] Failed to save Google Ads source:", error);
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
