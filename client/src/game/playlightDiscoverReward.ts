import { initPlaylight, markPlaylightDiscoveryUserInitiated } from "@/lib/playlight";
import { useGameStore } from "@/game/state";
import { saveGame } from "@/game/save";
import { buildGameState } from "@/game/stateHelpers";
import { logger } from "@/lib/logger";
import type { LogEntry } from "@/game/rules/events";

/** Persisted key under `social_media_rewards`. */
export const PLAYLIGHT_DISCOVER_REWARD_KEY = "playlight_discover";

export const PLAYLIGHT_DISCOVER_REWARD_GOLD = 100;

/** After click: Discovery opens, then this delay before gold + task completion. */
export const PLAYLIGHT_DISCOVER_REWARD_COMPLETE_DELAY_MS = 10_000;

let discoverRewardClaimInFlight = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/**
 * Opens Playlight Discovery, waits {@link PLAYLIGHT_DISCOVER_REWARD_COMPLETE_DELAY_MS}, then grants gold once and marks claimed.
 */
export async function claimPlaylightDiscoverReward(): Promise<boolean> {
  const store = useGameStore.getState();
  const currentRewards = store.social_media_rewards;

  if (currentRewards[PLAYLIGHT_DISCOVER_REWARD_KEY]?.claimed) {
    const alreadyClaimedLog: LogEntry = {
      id: `playlight-discover-already-${Date.now()}`,
      message: "You've already claimed this reward!",
      timestamp: Date.now(),
      type: "system",
    };
    store.addLogEntry(alreadyClaimedLog);
    return false;
  }

  if (discoverRewardClaimInFlight) {
    return false;
  }
  discoverRewardClaimInFlight = true;

  try {
    try {
      await initPlaylight();
      const playlightSDK = (
        window as typeof window & {
          playlightSDK?: { setDiscovery?: (visible?: boolean) => void };
        }
      ).playlightSDK;
      if (playlightSDK && typeof playlightSDK.setDiscovery === "function") {
        markPlaylightDiscoveryUserInitiated();
        playlightSDK.setDiscovery();
      }
    } catch (error) {
      logger.error("[PLAYLIGHT] Discover reward: could not open discovery:", error);
    }

    await delay(PLAYLIGHT_DISCOVER_REWARD_COMPLETE_DELAY_MS);

    const afterWait = useGameStore.getState();
    if (afterWait.social_media_rewards[PLAYLIGHT_DISCOVER_REWARD_KEY]?.claimed) {
      return false;
    }

    useGameStore.setState((state) => ({
      social_media_rewards: {
        ...state.social_media_rewards,
        [PLAYLIGHT_DISCOVER_REWARD_KEY]: {
          claimed: true,
          timestamp: Date.now(),
        },
      },
    }));

    useGameStore.getState().updateResource("gold", PLAYLIGHT_DISCOVER_REWARD_GOLD);

    const rewardLog: LogEntry = {
      id: `playlight-discover-claimed-${Date.now()}`,
      message: `You received ${PLAYLIGHT_DISCOVER_REWARD_GOLD} Gold for discovering games!`,
      timestamp: Date.now(),
      type: "system",
    };
    useGameStore.getState().addLogEntry(rewardLog);

    try {
      const currentState = useGameStore.getState();
      const gameState = buildGameState(currentState);
      await saveGame(gameState, false);
      useGameStore.setState({
        lastSaved: new Date().toLocaleTimeString(),
        isNewGame: false,
      });
    } catch (error) {
      logger.error("Failed to save Playlight discover reward claim:", error);
    }
    const { syncSocialPromoExclusiveRewardPending } = await import(
      "./socialPromoExclusiveReward"
    );
    syncSocialPromoExclusiveRewardPending();

    return true;
  } finally {
    discoverRewardClaimInFlight = false;
  }
}
