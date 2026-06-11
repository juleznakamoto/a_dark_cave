import { useGameStore, isModalDialogOpen } from "@/game/state";
import {
  guestAuthNotificationTriggerUpdates,
  shouldTriggerGuestAuthNotification,
} from "@/game/authNotificationAuto";
import { socialPromptHighestMilestoneIndexToOpen } from "@/game/socialPromptAuto";
import { FEEDBACK_PROMPT_PLAY_MS } from "@/game/feedbackPromptAuto";
import { isSocialPromoExclusiveRewardComplete } from "@/game/socialPromoExclusiveReward";

/**
 * Play-time auto prompts from the game loop. Non-blocking updates (auth dot) may
 * run alongside at most one blocking modal per invocation; each candidate re-reads
 * the store so same-tick stale snapshots cannot open two dialogs at once.
 */
export function processPlayTimeAutoPrompts(): void {
  let state = useGameStore.getState();
  const playTimeMs = state.playTime || 0;

  if (!state.isUserSignedIn) {
    const lastShown = state.lastAuthNotificationPlayTime ?? 0;
    if (
      shouldTriggerGuestAuthNotification({
        playTimeMs,
        lastShownPlayTimeMs: lastShown,
        authNotificationSeen: state.authNotificationSeen,
        authNotificationVisible: state.authNotificationVisible,
      })
    ) {
      useGameStore.setState(
        guestAuthNotificationTriggerUpdates({
          playTimeMs,
          lastShownPlayTimeMs: lastShown,
          authNotificationSeen: state.authNotificationSeen,
          authNotificationVisible: state.authNotificationVisible,
        }),
      );
    }
  }

  state = useGameStore.getState();
  if (tryOpenSocialRewardsPrompt(state, playTimeMs)) {
    return;
  }

  state = useGameStore.getState();
  tryOpenFeedbackPrompt(state, playTimeMs);
}

function tryOpenSocialRewardsPrompt(
  state: ReturnType<typeof useGameStore.getState>,
  playTimeMs: number,
): boolean {
  if (isSocialPromoExclusiveRewardComplete(state)) {
    return false;
  }

  const milestoneToOpen = socialPromptHighestMilestoneIndexToOpen(
    playTimeMs,
    state.socialPromptMilestoneIndex ?? 0,
  );
  // When blocked, leave socialPromptMilestoneIndex unchanged so the milestone retries.
  if (milestoneToOpen === null || isModalDialogOpen(state)) {
    return false;
  }

  useGameStore.setState({
    socialPromptDialogOpen: true,
    socialPromptMilestoneIndex: milestoneToOpen + 1,
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

  useGameStore.setState({
    feedbackDialogOpen: true,
    feedbackPromptShown: true,
  });
  return true;
}
