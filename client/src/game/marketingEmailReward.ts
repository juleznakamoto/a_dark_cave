import type { GameState } from "@shared/schema";
import { apiUrl } from "@/lib/apiUrl";
import { logger } from "@/lib/logger";
import { getCurrentUser, getSessionAccessToken } from "@/game/auth";
import { saveGame } from "@/game/save";
import { buildGameState } from "@/game/stateHelpers";
import { useGameStore } from "@/game/state";
import type { LogEntry } from "@/game/rules/events";
import { tWithFallback } from "@/i18n/resolveGameText";
import { syncSocialPromoExclusiveRewardPending } from "./socialPromoExclusiveReward";
import {
  isSocialRewardClaimed,
  isSocialRewardFulfilled,
} from "@/game/socialTaskRewards";

/** Persisted key under `social_media_rewards` (see profile menu). */
export const MARKETING_EMAIL_REWARD_KEY = "marketing_email";

export const MARKETING_SUBSCRIBE_GOLD = 100;

export type MarketingConsentSource =
  | "settings_toggle"
  | "social_prompt_dialog";

/**
 * Load marketing opt-in for confirmed email accounts only.
 * Skips the API for guests/anonymous sessions (avoids 401 noise on the server).
 */
export async function fetchMarketingOptInPreference(): Promise<boolean | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const accessToken = await getSessionAccessToken();
  if (!accessToken) return null;

  const res = await fetch(apiUrl("/api/marketing/preferences"), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;

  const j = (await res.json()) as { marketing_opt_in?: boolean };
  return j.marketing_opt_in === true;
}

/** Bearer token only when the player has a confirmed email account. */
export async function getConfirmedUserAccessToken(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return await getSessionAccessToken();
}

/**
 * POST marketing opt-in/out (same endpoint as Profile menu).
 * Caller handles UI toast/error messaging.
 */
export async function postMarketingPreference(params: {
  accessToken: string;
  marketingOptIn: boolean;
  consentSource: MarketingConsentSource;
}): Promise<void> {
  const res = await fetch(apiUrl("/api/marketing/preferences"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      marketing_opt_in: params.marketingOptIn,
      consent_source: params.consentSource,
      prompt_version: 1,
      consent_text_version: 1,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === "string" ? err.error : "Request failed",
    );
  }
}

function persistMarketingRewardState(): void {
  void (async () => {
    try {
      const currentState = useGameStore.getState();
      const gameState = buildGameState(currentState);
      await saveGame(gameState, false);
      useGameStore.setState({
        lastSaved: new Date().toLocaleTimeString(),
        isNewGame: false,
      });
    } catch (err) {
      logger.error("Failed to save marketing subscribe reward:", err);
    }
    syncSocialPromoExclusiveRewardPending();
  })();
}

/** Marks the email task fulfilled without granting gold (rewards dialog Claim step). */
export function markMarketingEmailFulfilled(): void {
  const entry =
    useGameStore.getState().social_media_rewards[MARKETING_EMAIL_REWARD_KEY];
  if (isSocialRewardFulfilled(entry)) return;

  useGameStore.setState((state) => ({
    social_media_rewards: {
      ...state.social_media_rewards,
      [MARKETING_EMAIL_REWARD_KEY]: {
        claimed: false,
        fulfilled: true,
        timestamp: Date.now(),
      },
    },
  }));

  persistMarketingRewardState();
}

/** Grants gold for a fulfilled email subscribe task. */
export function claimMarketingEmailGoldReward(): boolean {
  const entry =
    useGameStore.getState().social_media_rewards[MARKETING_EMAIL_REWARD_KEY];

  if (isSocialRewardClaimed(entry)) {
    syncSocialPromoExclusiveRewardPending();
    return false;
  }

  if (!isSocialRewardFulfilled(entry)) {
    return false;
  }

  useGameStore.setState((state) => ({
    social_media_rewards: {
      ...state.social_media_rewards,
      [MARKETING_EMAIL_REWARD_KEY]: {
        claimed: true,
        fulfilled: true,
        timestamp: entry?.timestamp ?? Date.now(),
      },
    },
  }));

  useGameStore.getState().updateResource("gold", MARKETING_SUBSCRIBE_GOLD);

  const rewardLog: LogEntry = {
    id: `marketing-email-reward-${Date.now()}`,
    message: tWithFallback(
      "ui",
      "socialPrompt.marketingSubscribeLog",
      `You received ${MARKETING_SUBSCRIBE_GOLD} Gold for subscribing to email updates!`,
      { amount: MARKETING_SUBSCRIBE_GOLD },
    ),
    timestamp: Date.now(),
    type: "system",
  };
  useGameStore.getState().addLogEntry(rewardLog);

  persistMarketingRewardState();
  return true;
}

/** Profile settings: fulfill + claim immediately when turning marketing emails on. */
export function applyMarketingSubscribeGoldReward(): void {
  markMarketingEmailFulfilled();
  claimMarketingEmailGoldReward();
}

/** Email counts as fulfilled if they ever claimed the one-time subscribe reward (persists if they unsubscribe later). */
export function isMarketingEmailRewardClaimedForPrompt(
  socialRewards: GameState["social_media_rewards"],
): boolean {
  return isSocialRewardFulfilled(socialRewards[MARKETING_EMAIL_REWARD_KEY]);
}
