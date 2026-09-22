import { useGameStore } from "@/game/state";
import { saveGame } from "@/game/save";
import { buildGameState } from "@/game/stateHelpers";
import { logger } from "@/lib/logger";
import type { LogEntry } from "@/game/rules/events";
import { tWithFallback } from "@/i18n/resolveGameText";
import {
  getSocialPlatformName,
  type SocialPlatformConfig,
} from "@/game/socialPlatforms";
import { syncSocialPromoExclusiveRewardPending } from "./socialPromoExclusiveReward";
import {
  getSocialPlatformRewardEntry,
  getSocialTaskResourceLabel,
  isSocialRewardClaimed,
  isSocialRewardFulfilled,
  type SocialTaskResourceReward,
} from "@/game/socialTaskRewards";

function persistSocialRewardState(): void {
  void (async () => {
    try {
      const currentState = useGameStore.getState();
      const gameState = buildGameState(currentState);
      await saveGame(gameState, false);
      useGameStore.setState({
        lastSaved: new Date().toLocaleTimeString(),
        isNewGame: false,
      });
    } catch (error) {
      logger.error("Failed to save social media reward claim:", error);
    }
    syncSocialPromoExclusiveRewardPending();
  })();
}

/** Opens the platform link and marks the task fulfilled (no reward until Claim). */
export function fulfillSocialFollowReward(
  platformId: SocialPlatformConfig["id"],
  url: string,
): boolean {
  const store = useGameStore.getState();
  const entry = getSocialPlatformRewardEntry(
    store.social_media_rewards,
    platformId,
  );

  if (isSocialRewardClaimed(entry)) {
    const alreadyClaimedLog: LogEntry = {
      id: `social-reward-already-claimed-${platformId}-${Date.now()}`,
      message: tWithFallback(
        "ui",
        "socialPrompt.alreadyClaimedReward",
        "You've already claimed this reward!",
      ),
      timestamp: Date.now(),
      type: "system",
    };
    store.addLogEntry(alreadyClaimedLog);
    return false;
  }

  if (isSocialRewardFulfilled(entry)) {
    return true;
  }

  window.open(url, "_blank");

  useGameStore.setState((state) => ({
    social_media_rewards: {
      ...state.social_media_rewards,
      [platformId]: {
        claimed: false,
        fulfilled: true,
        timestamp: Date.now(),
      },
    },
  }));

  persistSocialRewardState();
  return true;
}

/** Grants the resource reward for a fulfilled social follow task. Returns whether a new claim was made. */
export function claimSocialFollowTaskReward(
  platformId: SocialPlatformConfig["id"],
  reward: SocialTaskResourceReward,
): boolean {
  const store = useGameStore.getState();
  const entry = getSocialPlatformRewardEntry(
    store.social_media_rewards,
    platformId,
  );

  if (isSocialRewardClaimed(entry)) {
    return false;
  }

  if (!isSocialRewardFulfilled(entry)) {
    return false;
  }

  useGameStore.setState((state) => ({
    social_media_rewards: {
      ...state.social_media_rewards,
      [platformId]: {
        claimed: true,
        fulfilled: true,
        timestamp: entry?.timestamp ?? Date.now(),
      },
    },
  }));

  useGameStore.getState().updateResource(reward.resource, reward.amount);

  const platformName = getSocialPlatformName(platformId);
  const resourceLabel = getSocialTaskResourceLabel(reward.resource);
  const subscribeLog = platformId === "youtube";
  const rewardLog: LogEntry = {
    id: `social-reward-claimed-${platformId}-${Date.now()}`,
    message: tWithFallback(
      "ui",
      subscribeLog
        ? "socialPrompt.subscribeRewardLog"
        : "socialPrompt.followRewardLog",
      subscribeLog
        ? `You received ${reward.amount} ${resourceLabel} for subscribing to us on ${platformName}!`
        : `You received ${reward.amount} ${resourceLabel} for following us on ${platformName}!`,
      {
        amount: reward.amount,
        platform: platformName,
        resource: resourceLabel,
      },
    ),
    timestamp: Date.now(),
    type: "system",
  };
  useGameStore.getState().addLogEntry(rewardLog);

  persistSocialRewardState();
  return true;
}

/** Profile menu: fulfill + claim in one click. */
export function claimSocialFollowReward(
  platformId: SocialPlatformConfig["id"],
  url: string,
  reward: SocialTaskResourceReward,
): boolean {
  fulfillSocialFollowReward(platformId, url);
  return claimSocialFollowTaskReward(platformId, reward);
}
