import { useGameStore, isModalDialogOpen } from "@/game/state";
import {
  socialPromptHighestMilestoneIndexToOpen,
  socialPromptMilestoneIndexAfterOpen,
} from "@/game/socialPromptAuto";
import { FEEDBACK_PROMPT_PLAY_MS } from "@/game/feedbackPromptAuto";
import {
  isSocialPromoExclusiveRewardComplete,
  socialPromoExclusiveStepsCompleted,
} from "@/game/socialPromoExclusiveReward";
import { isSteamEditionActive } from "@/lib/edition";
import { openFeedbackDialog } from "@/lib/openFeedbackDialog";

/**
 * After one play-time auto prompt closes, wait this long (wall clock) before
 * opening another. Prevents social + feedback from stacking when both
 * thresholds were crossed while the tab was backgrounded.
 */
export const PLAY_TIME_AUTO_PROMPT_HANDOFF_MS = 90 * 1000;

let autoPromptWasOpen = false;
let nextAutoPromptEligibleAtMs = 0;

/** Reset handoff state (game loop start / tests). */
export function resetPlayTimeAutoPromptHandoff(): void {
  autoPromptWasOpen = false;
  nextAutoPromptEligibleAtMs = 0;
}

function isPlayTimeAutoPromptOpen(
  state: ReturnType<typeof useGameStore.getState>,
): boolean {
  return state.socialPromptDialogOpen || state.feedbackDialogOpen;
}

/**
 * Play-time auto prompts from the game loop. At most one blocking modal per
 * invocation; after one closes, another waits {@link PLAY_TIME_AUTO_PROMPT_HANDOFF_MS}
 * so returning to a tab past multiple thresholds does not stack dialogs.
 */
export function processPlayTimeAutoPrompts(): void {
  // Social rewards and feedback prompts are web-only.
  if (isSteamEditionActive()) return;

  let state = useGameStore.getState();
  const playTimeMs = state.playTime || 0;

  if (isPlayTimeAutoPromptOpen(state)) {
    autoPromptWasOpen = true;
    return;
  }

  if (autoPromptWasOpen) {
    autoPromptWasOpen = false;
    nextAutoPromptEligibleAtMs = Date.now() + PLAY_TIME_AUTO_PROMPT_HANDOFF_MS;
  }

  if (Date.now() < nextAutoPromptEligibleAtMs) {
    return;
  }

  if (tryOpenSocialRewardsPrompt(state, playTimeMs)) {
    autoPromptWasOpen = true;
    return;
  }

  state = useGameStore.getState();
  if (tryOpenFeedbackPrompt(state, playTimeMs)) {
    autoPromptWasOpen = true;
  }
}

function tryOpenSocialRewardsPrompt(
  state: ReturnType<typeof useGameStore.getState>,
  playTimeMs: number,
): boolean {
  if (isSocialPromoExclusiveRewardComplete(state)) {
    return false;
  }

  const completedTasks = socialPromoExclusiveStepsCompleted(state);

  const milestoneToOpen = socialPromptHighestMilestoneIndexToOpen(
    playTimeMs,
    state.socialPromptMilestoneIndex ?? 0,
    completedTasks,
  );
  // When blocked, leave socialPromptMilestoneIndex unchanged so the milestone retries.
  if (milestoneToOpen === null || isModalDialogOpen(state)) {
    return false;
  }

  useGameStore.setState({
    socialPromptDialogOpen: true,
    socialPromptMilestoneIndex: socialPromptMilestoneIndexAfterOpen(
      milestoneToOpen,
      completedTasks,
    ),
  });
  return true;
}

function tryOpenFeedbackPrompt(
  state: ReturnType<typeof useGameStore.getState>,
  playTimeMs: number,
): boolean {
  if (
    state.feedbackPromptShown ||
    playTimeMs < FEEDBACK_PROMPT_PLAY_MS ||
    isModalDialogOpen(state)
  ) {
    return false;
  }

  useGameStore.setState({ feedbackPromptShown: true });
  openFeedbackDialog("dialog");
  return true;
}
