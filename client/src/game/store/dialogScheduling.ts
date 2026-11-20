import { isBlockingDialogOpenFromRegistry } from "@/game/dialogRegistry";
import { isDemoPlayFrozen } from "@/game/demoLimit";
import { isGameTabHidden } from "@/lib/tabVisibility";
import { audioManager, SOUND_VOLUME } from "@/lib/audio";
import { playHaptic } from "@/lib/haptics";
import { madnessEvents } from "@/game/rules/eventsMadness";
import {
  gameEvents,
  getPendingModalEventDialogResume,
  snapshotPendingModalEvent,
  type LogEntry,
} from "@/game/rules/events";
import { SLEEP_DREAM_DELAY_MS } from "@/game/rules/eventsSleepDream";
import { shouldRestoreSleepDialog } from "@/game/sleepActivation";
import type { GameState } from "@shared/schema";
import type { CombatResultSummary } from "@/game/types";
import type { GameStore } from "./types";

/**
 * Dialog/modals that block simulation and freeze the timed-event-tab countdown.
 * When adding a new blocking dialog, add its flag here only (see workspace rule for `loop.ts`).
 * `inactivityDialogOpen` is included for the same pause semantics; the inactivity path also stops the rAF loop
 * separately to reduce idle CPU.
 *
 * `eventDialog.isOpen` already freezes sim for every normal timed/event choice shown in `EventDialog`
 * (including story beats such as `beyondGatePassagesClear`); only add a new OR-term here when introducing
 * a separate modal slice (new `*DialogOpen` flag), not for each `GameEvent` id.
 * Add entries in dialogRegistry.ts instead of extending this OR-chain.
 */
function isBlockingDialogOpen(state: GameStore): boolean {
  return isBlockingDialogOpenFromRegistry(state as unknown as Record<string, unknown>);
}

/**
 * True when any blocking modal except the reward dialog is open.
 * An active timed-event tab alone does not freeze sim - players can manage the village
 * while a forest visit timer runs (hotkeys still work via `shouldBlockGameHotkeys`).
 * Only additional timed-tab spawns are suppressed in `checkEvents` while a visit is open.
 */
function isNonRewardBlockingModalOpen(state: GameStore): boolean {
  return isBlockingDialogOpen(state);
}

/** Visible reward or blocking modal, excluding the post-close handoff gap. */
export function isVisibleModalDialogOpen(state: GameStore): boolean {
  return state.rewardDialog.isOpen || isNonRewardBlockingModalOpen(state);
}

/** True while simulation should freeze (loop, attack-wave timers, random events, etc.). */
export function isModalDialogOpen(state: GameStore): boolean {
  return isVisibleModalDialogOpen(state) || Boolean(state.dialogHandoffPending);
}

/**
 * The called merchant must not open on top of a dialog, a map replay, or
 * another visit. His travel timer stays armed and he arrives once the slot is free.
 */
export function isCallMerchantArrivalBlocked(state: GameStore): boolean {
  if (isVisibleModalDialogOpen(state) || state.dialogHandoffPending) return true;
  if (state.villageMapReplaying) return true;
  const tab = state.timedEventTab;
  return Boolean(
    tab?.isActive && !tab.event?.id?.includes("merchant"),
  );
}

/**
 * Settings is the only reason the sim is frozen. Background music stays up so
 * the music slider can be heard. Pause, idle, demo end, and any other modal
 * still duck it.
 */
export function shouldKeepBackgroundMusicDuringFreeze(state: GameStore): boolean {
  if (!state.settingsDialogOpen) return false;
  if (state.isPaused || state.idleModeState?.isActive || isDemoPlayFrozen(state)) {
    return false;
  }
  return !isModalDialogOpen({ ...state, settingsDialogOpen: false });
}

/**
 * True when tab keyboard shortcuts should be ignored.
 * Unlike `isModalDialogOpen`, an active timed-event tab alone does not block hotkeys -
 * players should still switch tabs with 1–9 / arrows while a visit is open.
 */
export function shouldBlockGameHotkeys(state: GameStore): boolean {
  return isModalDialogOpen(state);
}

/**
 * True when the timed-event tab countdown should stop (manual pause, reward dialog,
 * another blocking dialog, or a backgrounded game tab). Excludes the active timed
 * tab itself so the player's decision timer can still tick while they are looking.
 */
export function shouldFreezeTimedEventTabCountdown(state: GameStore): boolean {
  return (
    state.isPaused ||
    isModalDialogOpen(state) ||
    isDemoPlayFrozen(state) ||
    isGameTabHidden()
  );
}

const DIALOG_DEFER_POLL_MS = 200;
/** Pause after a blocking dialog closes before the next deferred dialog opens. */
const DIALOG_HANDOFF_DELAY_MS = 3000;

type GameStoreSetter = (
  partial:
    | Partial<GameStore>
    | ((state: GameStore) => Partial<GameStore>),
) => void;

type ScheduleWhenDialogClearOptions = {
  /** Override the post-clear pause (default {@link DIALOG_HANDOFF_DELAY_MS}). */
  handoffDelayMs?: number;
};

function scheduleWhenDialogClear(
  get: () => GameStore,
  isBlocked: (store: GameStore) => boolean,
  onOpen: () => void,
  initialDelayMs: number,
  options?: ScheduleWhenDialogClearOptions,
): void {
  const handoffDelayMs = options?.handoffDelayMs ?? DIALOG_HANDOFF_DELAY_MS;
  setTimeout(() => {
    let wasBlocked = false;
    const tryOpen = () => {
      const store = get();
      if (isBlocked(store)) {
        wasBlocked = true;
        setTimeout(tryOpen, DIALOG_DEFER_POLL_MS);
        return;
      }
      // Pause is not a dialog, so it must not start another handoff gap.
      // A queued event still has to wait until the player resumes.
      if (store.isPaused) {
        setTimeout(tryOpen, DIALOG_DEFER_POLL_MS);
        return;
      }
      if (wasBlocked) {
        // Re-enter tryOpen after handoff so a modal that reopened in the gap is
        // respected; the queued dialog keeps polling until it can actually show.
        setTimeout(() => {
          wasBlocked = false;
          tryOpen();
        }, handoffDelayMs);
        return;
      }
      onOpen();
    };
    tryOpen();
  }, initialDelayMs);
}

export function beginDialogHandoff(set: GameStoreSetter): void {
  set({ dialogHandoffPending: true });
}

export function openEventDialogNow(
  set: GameStoreSetter,
  currentEvent: LogEntry,
): void {
  set((state) => ({
    ...state,
    dialogHandoffPending: false,
    pendingModalEvent: snapshotPendingModalEvent(currentEvent),
    eventDialog: {
      isOpen: true,
      currentEvent,
      lastEndedAt: state.eventDialog?.lastEndedAt ?? 0,
    },
  }));

  if (!currentEvent.skipSound) {
    const eventId = currentEvent.id.split("-")[0];
    const madnessEventIds = Object.keys(madnessEvents);
    const isMadnessEvent = madnessEventIds.includes(eventId);
    audioManager.playSound(
      isMadnessEvent ? "eventMadness" : "event",
      isMadnessEvent ? SOUND_VOLUME.eventMadness : SOUND_VOLUME.eventUi,
    );
    playHaptic(isMadnessEvent ? "madnessEvent" : "event");
  }
}

/**
 * After `initialDelayMs`, opens the event dialog only when no blocking modal is up;
 * otherwise polls every {@link DIALOG_DEFER_POLL_MS} and waits {@link DIALOG_HANDOFF_DELAY_MS}
 * after the path is clear before opening (same deferral semantics as reward scheduling).
 */
/**
 * A queued copy of a beat the player already resolved should not open again.
 * Outcome lines and estate rereads are not catalog rolls, so they still show.
 */
function shouldDropDeferredEvent(get: () => GameStore, event: LogEntry): boolean {
  if (event.viewOnly) return false;
  if (event.id.startsWith("log-message-")) return false;
  const choices = Array.isArray(event.choices) ? event.choices : [];
  if (choices.length === 1 && choices[0]?.id === "acknowledge") return false;
  // Instance ids (`forestTribeHelpRequest-test`) are not catalog ids.
  // Only a real `eventId` can be checked against the rules.
  const eventId = event.eventId;
  if (!eventId) return false;
  const def = gameEvents[eventId];
  if (!def) return false;
  const state = get();
  if (!def.repeatable && state.triggeredEvents?.[eventId]) return true;
  try {
    return !def.condition(state as unknown as GameState);
  } catch {
    return false;
  }
}

export function scheduleEventDialogWhenClear(
  get: () => GameStore,
  set: GameStoreSetter,
  event: LogEntry,
  initialDelayMs: number,
  options?: ScheduleWhenDialogClearOptions & {
    /** Extra block (e.g. sleep still pending restore before its dialog opens). */
    isAlsoBlocked?: (store: GameStore) => boolean;
  },
): void {
  // Wait for visible modals only, not dialogHandoffPending. Handoff is the
  // gap this queued open is supposed to clear. Using isModalDialogOpen here
  // deadlocks: handoff stays true, the event never opens, and Cave action
  // bars sit at 0s because ticks stay frozen (pause button is still off).
  scheduleWhenDialogClear(
    get,
    (store) =>
      isVisibleModalDialogOpen(store) ||
      store.villageMapReplaying === true ||
      Boolean(options?.isAlsoBlocked?.(store)),
    () => {
      if (shouldDropDeferredEvent(get, event)) return;
      openEventDialogNow(set, event);
    },
    initialDelayMs,
    options,
  );
}

/**
 * Bumped whenever a sleep-deferred pending event is re-scheduled so an older
 * loadGame / orchestrator resume cannot open the same dialog twice.
 */
let pendingModalEventAfterSleepScheduleId = 0;

/**
 * Re-open a saved pending event after load. Sleep report wins when a session
 * still needs display: keep the snapshot closed, then open 5s after Sleep
 * closes (same gap as wake dreams).
 */
export function applyPendingModalEventDialogResume(
  get: () => GameStore,
  set: GameStoreSetter,
  state: GameState,
): ReturnType<typeof getPendingModalEventDialogResume> {
  const resume = getPendingModalEventDialogResume(state);
  const event = resume.eventDialog.currentEvent;
  if (!event) return resume;

  if (!shouldRestoreSleepDialog(state)) {
    return resume;
  }

  const scheduleId = ++pendingModalEventAfterSleepScheduleId;
  scheduleWhenDialogClear(
    get,
    (store) =>
      isVisibleModalDialogOpen(store) ||
      store.villageMapReplaying === true ||
      shouldRestoreSleepDialog(store),
    () => {
      // Pending-modal resume is an unfinished choice, not a re-roll: do not
      // drop when the catalog condition no longer holds.
      if (scheduleId !== pendingModalEventAfterSleepScheduleId) return;
      openEventDialogNow(set, event);
    },
    0,
    { handoffDelayMs: SLEEP_DREAM_DELAY_MS },
  );

  return {
    eventDialog: { isOpen: false, currentEvent: null, lastEndedAt: 0 },
    pendingModalEvent: resume.pendingModalEvent,
  };
}

/**
 * After `initialDelayMs`, opens the reward dialog only when no visible modal is open;
 * otherwise retries every {@link DIALOG_DEFER_POLL_MS} and waits {@link DIALOG_HANDOFF_DELAY_MS}
 * after the blocking dialog closes so back-to-back popups do not feel spammed.
 * Waits for an already-open reward so a second outcome cannot overwrite the first.
 */
/** After `initialDelayMs`, runs `onOpen` once no visible modal is up. */
export function scheduleCallbackWhenDialogClear(
  get: () => GameStore,
  onOpen: () => void,
  initialDelayMs: number,
): void {
  scheduleWhenDialogClear(get, isVisibleModalDialogOpen, onOpen, initialDelayMs);
}

export function scheduleRewardDialogWhenClear(
  get: () => GameStore,
  data: NonNullable<GameStore["rewardDialog"]["data"]>,
  initialDelayMs: number,
): void {
  scheduleWhenDialogClear(
    get,
    isVisibleModalDialogOpen,
    () => get().setRewardDialog(true, data),
    initialDelayMs,
  );
}

export function scheduleMadnessDialogWhenClear(
  get: () => GameStore,
  data: NonNullable<GameStore["madnessDialog"]["data"]>,
  initialDelayMs: number,
): void {
  // Match reward: wait while any visible modal (including this dialog) is open,
  // so a second open while already showing queues instead of re-entering immediately.
  scheduleWhenDialogClear(
    get,
    isVisibleModalDialogOpen,
    () => get().setMadnessDialog(true, data),
    initialDelayMs,
  );
}

export function scheduleInsightPotionDialogWhenClear(
  get: () => GameStore,
  data: NonNullable<GameStore["insightPotionDialog"]["data"]>,
  initialDelayMs: number,
): void {
  scheduleWhenDialogClear(
    get,
    isVisibleModalDialogOpen,
    () => get().setInsightPotionDialog(true, data),
    initialDelayMs,
  );
}

export function scheduleInsightIntroDialogWhenClear(
  get: () => GameStore,
  initialDelayMs: number,
): void {
  scheduleWhenDialogClear(
    get,
    isVisibleModalDialogOpen,
    () => get().setInsightIntroDialogOpen(true),
    initialDelayMs,
  );
}

export function scheduleVillageEffectDialogWhenClear(
  get: () => GameStore,
  data: NonNullable<GameStore["villageEffectDialog"]["data"]>,
  initialDelayMs: number,
): void {
  scheduleWhenDialogClear(
    get,
    isVisibleModalDialogOpen,
    () => get().setVillageEffectDialog(true, data),
    initialDelayMs,
  );
}

export function scheduleMadnessDialogAfterCombat(
  get: () => GameStore,
  madnessChange: number,
  combatSummary?: CombatResultSummary,
  title?: string,
): void {
  if (madnessChange === 0) return;
  // Attack-wave defeat overlay already shows madness via _combatSummary.madnessGain.
  if ((combatSummary?.madnessGain ?? 0) > 0) return;
  scheduleWhenDialogClear(
    get,
    (store) => store.combatDialog.isOpen,
    () =>
      get().setMadnessDialog(true, {
        madnessChange,
        ...(title?.trim() ? { title } : {}),
      }),
    DIALOG_HANDOFF_DELAY_MS,
  );
}
