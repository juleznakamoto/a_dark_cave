export type { GameStore, ResourceChangeEvent } from "./types";
export {
  detectRewards,
  rewardPayloadHasPositiveChanges,
  rewardPayloadHasOutcomeLosses,
  mergeRewardPayloads,
  rewardDialogActions,
  rewardDialogVillageAttackEvents,
  detectMadnessChange,
  resolveEventOutcomeTitle,
  getClarityElixirCaveEventId,
  getCaveWallMarkingsEventId,
} from "./rewards";
export { mergeStateUpdates } from "./mergeStateUpdates";
export { createInitialState, defaultGameState } from "./createInitialState";
export {
  isVisibleModalDialogOpen,
  isModalDialogOpen,
  shouldBlockGameHotkeys,
  shouldFreezeTimedEventTabCountdown,
  scheduleMadnessDialogWhenClear,
  scheduleInsightPotionDialogWhenClear,
  scheduleVillageEffectDialogWhenClear,
  scheduleMadnessDialogAfterCombat,
  beginDialogHandoff,
  openEventDialogNow,
  scheduleEventDialogWhenClear,
  scheduleRewardDialogWhenClear,
} from "./dialogScheduling";
export {
  INACTIVE_TIMED_EVENT_TAB,
  getTimedEventTabCleanupPatch,
} from "./timedEventTab";
export {
  syncTimedEventTabPauseTracking,
  getTimedEventTabEffectiveRemainingMs,
} from "./timedEventTabSync";
export { StateManager } from "./StateManager";
export { playActionStartSfx } from "./actionSfx";
export { useGameStore } from "./createGameStore";
