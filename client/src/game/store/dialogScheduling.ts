import { isBlockingDialogOpenFromRegistry } from "@/game/dialogRegistry";
import { isDemoPlayFrozen } from "@/game/demoLimit";
import { isGameTabHidden } from "@/lib/tabVisibility";
import { audioManager, SOUND_VOLUME } from "@/lib/audio";
import { madnessEvents } from "@/game/rules/eventsMadness";
import { snapshotPendingModalEvent, type LogEntry } from "@/game/rules/events";
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

function scheduleWhenDialogClear(
  get: () => GameStore,
  isBlocked: (store: GameStore) => boolean,
  onOpen: () => void,
  initialDelayMs: number,
): void {
  setTimeout(() => {
    let wasBlocked = false;
    const tryOpen = () => {
      if (isBlocked(get())) {
        wasBlocked = true;
        setTimeout(tryOpen, DIALOG_DEFER_POLL_MS);
        return;
      }
      if (wasBlocked) {
        // Re-enter tryOpen after handoff so a modal that reopened in the gap is
        // respected; the queued dialog keeps polling until it can actually show.
        setTimeout(() => {
          wasBlocked = false;
          tryOpen();
        }, DIALOG_HANDOFF_DELAY_MS);
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
  }
}

/**
 * After `initialDelayMs`, opens the event dialog only when no blocking modal is up;
 * otherwise polls every {@link DIALOG_DEFER_POLL_MS} and waits {@link DIALOG_HANDOFF_DELAY_MS}
 * after the path is clear before opening (same deferral semantics as reward scheduling).
 */
export function scheduleEventDialogWhenClear(
  get: () => GameStore,
  set: GameStoreSetter,
  event: LogEntry,
  initialDelayMs: number,
): void {
  // Wait for visible modals only, not dialogHandoffPending. Handoff is the
  // gap this queued open is supposed to clear. Using isModalDialogOpen here
  // deadlocks: handoff stays true, the event never opens, and Cave action
  // bars sit at 0s because ticks stay frozen (pause button is still off).
  scheduleWhenDialogClear(
    get,
    isVisibleModalDialogOpen,
    () => openEventDialogNow(set, event),
    initialDelayMs,
  );
}

/**
 * After `initialDelayMs`, opens the reward dialog only when no visible modal is open;
 * otherwise retries every {@link DIALOG_DEFER_POLL_MS} and waits {@link DIALOG_HANDOFF_DELAY_MS}
 * after the blocking dialog closes so back-to-back popups do not feel spammed.
 * Waits for an already-open reward so a second outcome cannot overwrite the first.
 */
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
