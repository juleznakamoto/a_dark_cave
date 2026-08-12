/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GAME_FEEDBACK_FORM_BASE_URL,
  getGameFeedbackFormUrl,
  openGameFeedbackFormFromDialog,
  rememberFeedbackFormSource,
} from "./gameFeedbackForm";
import { openFeedbackDialog } from "./openFeedbackDialog";

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

  it("supports end, dialog, and demoEnd sources", () => {
    expect(new URL(getGameFeedbackFormUrl("end")).searchParams.get("adc_source")).toBe(
      "end",
    );
    expect(
      new URL(getGameFeedbackFormUrl("dialog")).searchParams.get("adc_source"),
    ).toBe("dialog");
    expect(
      new URL(getGameFeedbackFormUrl("demoEnd")).searchParams.get("adc_source"),
    ).toBe("demoEnd");
  });
});

describe("openFeedbackDialog", () => {
  beforeEach(() => {
    vi.mocked(useGameStore.setState).mockClear();
  });

  it("opens the dialog synchronously and remembers source for the form CTA", () => {
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

  it("rememberFeedbackFormSource alone drives the dialog form CTA", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    rememberFeedbackFormSource("footer");
    openGameFeedbackFormFromDialog();
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining("adc_source=footer"),
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });
});
