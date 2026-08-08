/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GAME_FEEDBACK_FORM_BASE_URL,
  getGameFeedbackFormUrl,
  openFeedbackDialog,
  openGameFeedbackFormFromDialog,
} from "./gameFeedbackForm";

vi.mock("@/game/state", () => ({
  useGameStore: {
    setState: vi.fn(),
  },
}));

import { useGameStore } from "@/game/state";

describe("getGameFeedbackFormUrl", () => {
  it("keeps the base path and tags the source", () => {
    const href = getGameFeedbackFormUrl("footer");
    expect(href.startsWith(GAME_FEEDBACK_FORM_BASE_URL)).toBe(true);
    expect(new URL(href).searchParams.get("adc_source")).toBe("footer");
  });

  it("supports end and dialog sources", () => {
    expect(new URL(getGameFeedbackFormUrl("end")).searchParams.get("adc_source")).toBe(
      "end",
    );
    expect(
      new URL(getGameFeedbackFormUrl("dialog")).searchParams.get("adc_source"),
    ).toBe("dialog");
  });
});

describe("openFeedbackDialog", () => {
  beforeEach(() => {
    vi.mocked(useGameStore.setState).mockClear();
  });

  it("opens the dialog and remembers source for the form CTA", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    openFeedbackDialog("end");
    expect(useGameStore.setState).toHaveBeenCalledWith({
      feedbackDialogOpen: true,
    });
    openGameFeedbackFormFromDialog();
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining("adc_source=end"),
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });
});
