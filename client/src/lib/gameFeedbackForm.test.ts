/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GAME_FEEDBACK_FORM_BASE_URL,
  feedbackFormButtonId,
  getGameFeedbackFormUrl,
  openGameFeedbackForm,
  openGameFeedbackFormFromDialog,
  rememberFeedbackFormSource,
} from "./gameFeedbackForm";
import { openFeedbackDialog } from "./openFeedbackDialog";

const { trackButtonClick, setState } = vi.hoisted(() => ({
  trackButtonClick: vi.fn(),
  setState: vi.fn(),
}));

vi.mock("@/game/state", () => ({
  useGameStore: {
    setState,
    getState: () => ({
      trackButtonClick,
      gameId: "game-test",
    }),
  },
}));

import { useGameStore } from "@/game/state";

describe("feedbackFormButtonId", () => {
  it("keeps the historical end-screen id and tags other sources", () => {
    expect(feedbackFormButtonId("end")).toBe("end-screen-feedback");
    expect(feedbackFormButtonId("footer")).toBe("feedback-open-footer");
    expect(feedbackFormButtonId("dialog")).toBe("feedback-open-dialog");
    expect(feedbackFormButtonId("demoEnd")).toBe("feedback-open-demoEnd");
  });
});

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

describe("openGameFeedbackForm analytics", () => {
  beforeEach(() => {
    trackButtonClick.mockClear();
    setState.mockClear();
  });

  it("records footer clicks for admin lookup by player and wall-clock time", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const before = Date.now();
    openGameFeedbackForm("footer");
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining("adc_source=footer"),
      "_blank",
      "noopener,noreferrer",
    );
    await vi.waitFor(() => {
      expect(trackButtonClick).toHaveBeenCalledWith("feedback-open-footer");
    });
    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        lastFeedbackOpenedSource: "footer",
      }),
    );
    const stamp = setState.mock.calls.find(
      (call) => call[0] && typeof call[0] === "object" && "lastFeedbackOpenedAt" in call[0],
    )?.[0] as { lastFeedbackOpenedAt: number };
    expect(stamp.lastFeedbackOpenedAt).toBeGreaterThanOrEqual(before);
    openSpy.mockRestore();
  });
});

describe("openFeedbackDialog", () => {
  beforeEach(() => {
    vi.mocked(useGameStore.setState).mockClear();
    trackButtonClick.mockClear();
    setState.mockClear();
  });

  it("opens the dialog synchronously and remembers source for the form CTA", async () => {
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
    await vi.waitFor(() => {
      expect(trackButtonClick).toHaveBeenCalledWith("end-screen-feedback");
    });
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
