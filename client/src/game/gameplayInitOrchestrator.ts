import { logger } from "@/lib/logger";
import { isDemoEdition, isLocalOnlyEdition, shouldSyncSteamAchievements } from "@/lib/edition";
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
  loadGameFromSupabase,
  processReferralAfterConfirmation,
  syncStoreAuthFromSession,
} from "@/game/auth";
import { parseStartupIntent, type StartupLocation } from "@/game/startupIntent";
import {
  applyStartupUrlCleanup,
  consumeStartupAuthCallback,
} from "@/game/startupUrlCleanup";
import { consumePreparedGameHydration } from "@/game/startupGameLoader";
import { clearPreferStartScreen } from "@/game/startupBootSurface";
import { rehydratePurchasesOnStartup } from "@/game/shopPurchases";
import { mountFiraSansFontFace } from "@/lib/firaSansFontFace";
import { reportUtmLanding } from "@/lib/utmLanding";
import { hasUtmAttribution } from "@shared/utmAttribution";
import { pickPreferredSave } from "@/game/saveConflict";
import { applyReferralCloudRefreshPatch } from "@/game/referralCloudRefresh";
import type { GameState, SaveData } from "@shared/schema";

export interface GameplayInitResult {
  hadPersistedSave: boolean;
  showEmailConfirmedDialog: boolean;
  openShop: boolean;
  cruelShopHighlight: boolean;
  /** Auth, cloud merge, Stripe, audio, and fonts. Does not block first paint. */
  background: Promise<void>;
}

type BackgroundInitContext = {
  didLocalLoad: boolean;
  persistAttribution: boolean;
};

/**
 * Paint after local hydrate. Auth, cloud, Stripe, audio, and fonts continue
 * in `background` so returning visits are not gated on the network.
 */
export async function runGameplayInitialization(
  location: StartupLocation = window.location,
): Promise<GameplayInitResult> {
  const gameplayLocalesPromise = ensureGameplayLocalesLoaded();
  clearPreferStartScreen();

  const intent = parseStartupIntent(location);
  if (intent.oauthCallback) {
    logger.log("[GAME] OAuth callback detected, processing authentication");
  }
  if (intent.emailConfirmed) {
    logger.log("[GAME] Email confirmation callback detected");
  }

  reportUtmLanding(location, intent.utmAttribution);

  const preparedHydration = consumePreparedGameHydration();
  const alreadyStarted = useGameStore.getState().flags.gameStarted === true;
  const didLocalLoad = preparedHydration == null && !alreadyStarted;
  const hadPersistedSave =
    preparedHydration?.hadPersistedSave ??
    (alreadyStarted
      ? false
      : await useGameStore.getState().loadGame({ cloud: false }));

  await gameplayLocalesPromise;

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
  useGameStore.getState().resumePendingModalEventDialog?.();

  if (hadPersistedSave) {
    logger.log("[GAME] Game loaded from save");
    syncSocialPromoExclusiveRewardPending();
  } else {
    logger.log("[GAME] Game initialized with defaults");
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
    }
  }

  if (isDemoEdition()) {
    const loadedState = useGameStore.getState();
    if (
      isDemoLimitReachedFromState(loadedState) &&
      !loadedState.demoEndDialogDismissed
    ) {
      useGameStore.setState({ galaxyTimeUpDialogOpen: true });
    }
  }

  startGameLoop();

  return {
    hadPersistedSave,
    showEmailConfirmedDialog:
      intent.emailConfirmed && !isLocalOnlyEdition(),
    openShop: intent.openShop,
    cruelShopHighlight: intent.cruelShopHighlight,
    background: Promise.resolve().then(() =>
      finishGameplayInitialization(location, {
        didLocalLoad,
        persistAttribution: shouldTrackGoogleAds || shouldTrackUtm,
      }),
    ),
  };
}

async function finishGameplayInitialization(
  location: StartupLocation,
  { didLocalLoad, persistAttribution }: BackgroundInitContext,
): Promise<void> {
  const intent = parseStartupIntent(location);

  await consumeStartupAuthCallback(location);
  applyStartupUrlCleanup(location, [
    "auth-callback",
    "email-confirmed",
    "referral",
  ]);

  const user = isLocalOnlyEdition() ? null : await getCurrentUser();
  if (user) {
    logger.log("[GAME] User authenticated, loading game");
    await syncStoreAuthFromSession();
    await flushPendingMarketingPreferences();
  }

  if (didLocalLoad && user) {
    await reconcileCloudWithoutWipingLivePlay();
    await syncStoreAuthFromSession();
  }

  // Email-confirm and returning loads use loadGame({ cloud: false }) first,
  // then reconcile without a full loadGame when local is preferred or there
  // is no cloud save yet. Claim here so ?ref= / user_metadata still writes
  // the ledger after verify, and so the inviter picks up credit on refresh.
  if (user) {
    await processReferralAfterConfirmation();
  }

  if (persistAttribution) {
    try {
      await saveGame(useGameStore.getState(), false);
      logger.log("[GAME] Successfully saved campaign attribution");
    } catch (error) {
      logger.error("[GAME] Failed to save campaign attribution:", error);
    }
  }

  if (
    user &&
    useGameStore.getState().referrals?.some((referral) => referral.claimed)
  ) {
    logger.log("[GAME] Detected claimed referrals - saving to cloud");
    try {
      await saveGame(useGameStore.getState(), false);
      logger.log("[GAME] Successfully saved claimed referrals to cloud");
    } catch (error) {
      logger.error("[GAME] Failed to save claimed referrals:", error);
    }
  }

  if (intent.boost && useGameStore.getState().boostApplied) {
    try {
      await saveGame(useGameStore.getState(), false);
      logger.log("[GAME] One-time /boost bonus applied and saved");
    } catch (error) {
      logger.error("[GAME] Failed to save after /boost bonus:", error);
    }
  }

  if (!isLocalOnlyEdition()) {
    await rehydratePurchasesOnStartup({
      paymentReturn: intent.paymentReturn,
      skipIfPaymentReturn: true,
    });
    await processStripePaymentReturn();
  }

  applyStartupUrlCleanup(location, [
    "campaign",
    "shop",
    ...(intent.boost ? (["boost-path"] as const) : []),
  ]);

  void mountFiraSansFontFace({
    stage: "game",
    applyFontLoadedClass: true,
  });
  mountNotoSansSymbols2FontFace();

  const { audioManager } = await import("@/lib/audio");
  const audioState = useGameStore.getState();
  audioManager.setMusicVolume(audioState.musicVolume ?? 1);
  audioManager.setSfxVolume(audioState.sfxVolume ?? 1);
  audioManager.musicMute(audioState.musicMuted);
  audioManager.sfxMute(audioState.sfxMuted);

  if (audioState.flags.gameStarted || intent.forceGame) {
    await audioManager.loadGameSounds();
    if (!audioState.musicMuted) {
      await audioManager.startBackgroundMusic();
    }
  }

  if (shouldSyncSteamAchievements()) {
    void import("@/achievements/steamAchievements").then(
      ({ syncSteamAchievements }) =>
        syncSteamAchievements(useGameStore.getState()),
    );
  }
}

/**
 * Signed-in cloud follow-up after a live local hydrate.
 * Do not call `loadGame()` here: that would replace the store with a stale
 * IndexedDB snapshot and wipe clicks since first paint. Replace only when
 * cloud is preferred (other device / newer run).
 */
async function reconcileCloudWithoutWipingLivePlay(): Promise<void> {
  try {
    const cloudSave = await loadGameFromSupabase();
    const live = useGameStore.getState() as GameState;
    if (!cloudSave) {
      return;
    }

    const localEnvelope = {
      gameState: live,
      playTime: live.playTime ?? 0,
      timestamp: Date.now(),
    } as SaveData;
    if (pickPreferredSave(localEnvelope, cloudSave) === "cloud") {
      await useGameStore.getState().loadGame();
      return;
    }

    const patch = applyReferralCloudRefreshPatch(live, cloudSave.gameState);
    if (patch.changed) {
      useGameStore.setState(patch.nextState);
    }
  } catch (error) {
    logger.error("[GAME] Cloud reconcile after local hydrate failed:", error);
  }
}
