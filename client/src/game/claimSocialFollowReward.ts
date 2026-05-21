import { useGameStore } from "@/game/state";
import { saveGame } from "@/game/save";
import { buildGameState } from "@/game/stateHelpers";
import { logger } from "@/lib/logger";
import type { LogEntry } from "@/game/rules/events";
import { tWithFallback } from "@/i18n/resolveGameText";
import {
  getSocialPlatformTitle,
  type SocialPlatformConfig,
} from "@/game/socialPlatforms";

/** Same behavior as Profile → social rows: open link, grant gold once, save. Returns whether a new claim was made. */
export function claimSocialFollowReward(
  platformId: SocialPlatformConfig["id"],
  url: string,
  reward: number,
): boolean {
  const store = useGameStore.getState();
  const currentRewards = store.social_media_rewards;

  if (currentRewards[platformId]?.claimed) {
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

  window.open(url, "_blank");

  useGameStore.setState((state) => ({
    social_media_rewards: {
      ...state.social_media_rewards,
      [platformId]: {
        claimed: true,
        timestamp: Date.now(),
      },
    },
  }));

  useGameStore.getState().updateResource("gold", reward);

  const platformTitle = getSocialPlatformTitle(platformId, reward);
  const rewardLog: LogEntry = {
    id: `social-reward-claimed-${platformId}-${Date.now()}`,
    message: tWithFallback(
      "ui",
      "socialPrompt.followRewardLog",
      `You received ${reward} Gold for following us on ${platformTitle}!`,
      { amount: reward, platform: platformTitle },
    ),
    timestamp: Date.now(),
    type: "system",
  };
  useGameStore.getState().addLogEntry(rewardLog);

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
    const { syncSocialPromoExclusiveRewardPending } = await import(
      "./socialPromoExclusiveReward"
    );
    syncSocialPromoExclusiveRewardPending();
  })();

  return true;
}
