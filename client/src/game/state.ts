export type { GameStore, ResourceChangeEvent } from "./store/types";
export {
  detectRewards,
  rewardPayloadHasPositiveChanges,
  rewardPayloadHasOutcomeLosses,
  mergeRewardPayloads,
  rewardDialogActions,
  rewardDialogVillageAttackEvents,
} from "./store/rewards";
export { createInitialState } from "./store/createInitialState";
export {
  isVisibleModalDialogOpen,
  isModalDialogOpen,
  shouldKeepBackgroundMusicDuringFreeze,
  shouldBlockGameHotkeys,
  shouldFreezeTimedEventTabCountdown,
} from "./store/dialogScheduling";
export {
  INACTIVE_TIMED_EVENT_TAB,
  getTimedEventTabCleanupPatch,
} from "./store/timedEventTab";
export {
  syncTimedEventTabPauseTracking,
  getTimedEventTabEffectiveRemainingMs,
} from "./store/timedEventTabSync";
export { StateManager } from "./store/StateManager";
export { useGameStore } from "./store/createGameStore";
