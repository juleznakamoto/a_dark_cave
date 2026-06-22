import { initPlaylight, markPlaylightDiscoveryUserInitiated } from "@/lib/playlight";
import { useGameStore } from "@/game/state";
import { saveGame } from "@/game/save";
import { buildGameState } from "@/game/stateHelpers";
import { logger } from "@/lib/logger";
import type { LogEntry } from "@/game/rules/events";
import { tWithFallback } from "@/i18n/resolveGameText";
import {
  PLAYLIGHT_DISCOVER_REWARD_COMPLETE_DELAY_MS,
  PLAYLIGHT_DISCOVER_REWARD_GOLD,
  PLAYLIGHT_DISCOVER_REWARD_KEY,
} from "@/game/playlightRewards";
import { syncSocialPromoExclusiveRewardPending } from "./socialPromoExclusiveReward";
import {
  isSocialRewardClaimed,
  isSocialRewardFulfilled,
} from "@/game/socialTaskRewards";

export {
  PLAYLIGHT_DISCOVER_REWARD_COMPLETE_DELAY_MS,
  PLAYLIGHT_DISCOVER_REWARD_GOLD,
  PLAYLIGHT_DISCOVER_REWARD_KEY,
} from "@/game/playlightRewards";

let discoverRewardClaimInFlight = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function persistPlaylightDiscoverState(): void {
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
      logger.error("Failed to save Playlight discover reward claim:", error);
    }
    syncSocialPromoExclusiveRewardPending();
  })();
}

/**
 * Opens Playlight Discovery, waits {@link PLAYLIGHT_DISCOVER_REWARD_COMPLETE_DELAY_MS}, then marks fulfilled (no gold until Claim).
 */
export async function fulfillPlaylightDiscoverReward(): Promise<boolean> {
  const store = useGameStore.getState();
  const entry = store.social_media_rewards[PLAYLIGHT_DISCOVER_REWARD_KEY];

  if (isSocialRewardClaimed(entry)) {
    const alreadyClaimedLog: LogEntry = {
      id: `playlight-discover-already-${Date.now()}`,
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
    if (
      isSocialRewardClaimed(
        afterWait.social_media_rewards[PLAYLIGHT_DISCOVER_REWARD_KEY],
      )
    ) {
      return false;
    }

    useGameStore.setState((state) => ({
      social_media_rewards: {
        ...state.social_media_rewards,
        [PLAYLIGHT_DISCOVER_REWARD_KEY]: {
          claimed: false,
          fulfilled: true,
          timestamp: Date.now(),
        },
      },
    }));

    persistPlaylightDiscoverState();
    return true;
  } finally {
    discoverRewardClaimInFlight = false;
  }
}

/** Grants gold for a fulfilled Playlight discover task. */
export async function claimPlaylightDiscoverGoldReward(): Promise<boolean> {
  const store = useGameStore.getState();
  const entry = store.social_media_rewards[PLAYLIGHT_DISCOVER_REWARD_KEY];

  if (isSocialRewardClaimed(entry)) {
    return false;
  }

  if (!isSocialRewardFulfilled(entry)) {
    return false;
  }

  useGameStore.setState((state) => ({
    social_media_rewards: {
      ...state.social_media_rewards,
      [PLAYLIGHT_DISCOVER_REWARD_KEY]: {
        claimed: true,
        fulfilled: true,
        timestamp: entry?.timestamp ?? Date.now(),
      },
    },
  }));

  useGameStore.getState().updateResource("gold", PLAYLIGHT_DISCOVER_REWARD_GOLD);

  const rewardLog: LogEntry = {
    id: `playlight-discover-claimed-${Date.now()}`,
    message: tWithFallback(
      "ui",
      "socialPrompt.playlightDiscoverRewardLog",
      `You received ${PLAYLIGHT_DISCOVER_REWARD_GOLD} Gold for discovering games!`,
      { amount: PLAYLIGHT_DISCOVER_REWARD_GOLD },
    ),
    timestamp: Date.now(),
    type: "system",
  };
  useGameStore.getState().addLogEntry(rewardLog);

  persistPlaylightDiscoverState();
  return true;
}

/** Legacy one-shot: fulfill then claim immediately. */
export async function claimPlaylightDiscoverReward(): Promise<boolean> {
  await fulfillPlaylightDiscoverReward();
  return claimPlaylightDiscoverGoldReward();
}
