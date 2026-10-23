import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "@/game/state";
import { createInitialState } from "@/game/store/createInitialState";
import { INSIGHT_INTRO_SEEN_KEY } from "./insightIntro";

describe("insight intro first-gain trigger", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGameStore.setState({
      ...createInitialState(),
      insightIntroDialogOpen: false,
      resources: { ...createInitialState().resources, insight: 0 },
      seenResources: [],
      story: {
        ...createInitialState().story,
        seen: {},
      },
      buildings: { ...createInitialState().buildings, clerksHut: 1 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens after the first Insight gain via updateResource", () => {
    expect(useGameStore.getState().insightIntroDialogOpen).toBe(false);
    expect(useGameStore.getState().story.seen[INSIGHT_INTRO_SEEN_KEY]).toBeFalsy();

    useGameStore.getState().updateResource("insight", 1);

    expect(useGameStore.getState().resources.insight).toBe(1);
    expect(useGameStore.getState().story.seen[INSIGHT_INTRO_SEEN_KEY]).toBe(true);
    expect(useGameStore.getState().insightIntroDialogOpen).toBe(false);

    vi.advanceTimersByTime(500);
    expect(useGameStore.getState().insightIntroDialogOpen).toBe(true);
  });

  it("does not open again on a later Insight gain", () => {
    useGameStore.getState().updateResource("insight", 1);
    vi.advanceTimersByTime(500);
    useGameStore.getState().setInsightIntroDialogOpen(false);

    useGameStore.getState().updateResource("insight", 5);
    vi.advanceTimersByTime(500);

    expect(useGameStore.getState().insightIntroDialogOpen).toBe(false);
    expect(useGameStore.getState().resources.insight).toBe(6);
  });
});
