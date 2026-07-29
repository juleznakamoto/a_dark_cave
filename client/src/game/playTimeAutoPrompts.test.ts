import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PLAY_TIME_AUTO_PROMPT_HANDOFF_MS,
  processPlayTimeAutoPrompts,
  resetPlayTimeAutoPromptHandoff,
} from "./playTimeAutoPrompts";
import { FEEDBACK_PROMPT_PLAY_MS } from "./feedbackPromptAuto";
import { useGameStore } from "./state";

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isSteamEditionActive: () => false,
  };
});

const MIN = 60 * 1000;

describe("processPlayTimeAutoPrompts", () => {
  beforeEach(() => {
    vi.useRealTimers();
    resetPlayTimeAutoPromptHandoff();
    useGameStore.getState().initialize();
    useGameStore.setState({
      playTime: 0,
      socialPromptDialogOpen: false,
      socialPromptMilestoneIndex: 0,
      feedbackDialogOpen: false,
      feedbackPromptShown: false,
      socialPromoExclusiveRewardPending: false,
    });
  });

  it("opens at most one auto prompt per tick when both thresholds are due", () => {
    useGameStore.setState({
      playTime: 120 * MIN,
      socialPromptMilestoneIndex: 0,
      feedbackPromptShown: false,
    });

    processPlayTimeAutoPrompts();

    const afterFirst = useGameStore.getState();
    expect(afterFirst.socialPromptDialogOpen).toBe(true);
    expect(afterFirst.feedbackDialogOpen).toBe(false);
    expect(afterFirst.feedbackPromptShown).toBe(false);
  });

  it("delays the second auto prompt until the handoff elapses after the first closes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

    useGameStore.setState({
      playTime: 120 * MIN,
      socialPromptMilestoneIndex: 0,
      feedbackPromptShown: false,
    });

    processPlayTimeAutoPrompts();
    expect(useGameStore.getState().socialPromptDialogOpen).toBe(true);

    // Loop keeps ticking while the dialog is open (arms handoff on close).
    processPlayTimeAutoPrompts();
    useGameStore.setState({ socialPromptDialogOpen: false });
    processPlayTimeAutoPrompts();

    expect(useGameStore.getState().feedbackDialogOpen).toBe(false);
    expect(useGameStore.getState().feedbackPromptShown).toBe(false);

    vi.advanceTimersByTime(PLAY_TIME_AUTO_PROMPT_HANDOFF_MS - 1);
    processPlayTimeAutoPrompts();
    expect(useGameStore.getState().feedbackDialogOpen).toBe(false);

    vi.advanceTimersByTime(1);
    processPlayTimeAutoPrompts();

    const afterHandoff = useGameStore.getState();
    expect(afterHandoff.feedbackDialogOpen).toBe(true);
    expect(afterHandoff.feedbackPromptShown).toBe(true);
    expect(afterHandoff.socialPromptDialogOpen).toBe(false);
  });

  it("opens feedback promptly when no prior auto prompt is open", () => {
    useGameStore.setState({
      playTime: FEEDBACK_PROMPT_PLAY_MS,
      socialPromptMilestoneIndex: 5,
      feedbackPromptShown: false,
    });

    processPlayTimeAutoPrompts();

    expect(useGameStore.getState().feedbackDialogOpen).toBe(true);
    expect(useGameStore.getState().feedbackPromptShown).toBe(true);
  });
});
