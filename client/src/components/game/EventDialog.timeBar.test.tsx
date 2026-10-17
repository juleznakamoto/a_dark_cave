/**
 * @vitest-environment jsdom
 */
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventDialog from "./EventDialog";
import { caveEvents } from "@/game/rules/eventsCave";
import { TIMED_EVENT_TIME_BAR_PULSE_CLASS } from "@/game/timedEventTimeBar";
import i18n from "@/i18n";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";

vi.mock("@/game/headerIndicatorIcons", () => ({
  getVillageEffectTheme: () => ({
    border: "",
    chromeColor: "",
    iconRing: "",
    glowRgb: "",
    iconClassName: "",
    symbol: "",
  }),
}));

vi.mock("@/lib/audio", () => ({
  audioManager: {
    startEventAmbience: vi.fn(),
    stopEventAmbience: vi.fn(),
  },
  EVENT_DIALOG_AMBIENCE_FADE_SECONDS: 0,
  SOUND_VOLUME: { eventDialog: 1 },
}));

function renderTimedDialog(elapsedSeconds: number) {
  const now = Date.now();
  render(
    <EventDialog
      isOpen
      onClose={() => {}}
      event={{
        id: "ringOfDrownedChoice",
        title: "The Ring",
        message: "A ring lies in the water.",
        type: "event",
        timestamp: now - elapsedSeconds * 1000,
        isTimedChoice: true,
        baseDecisionTime: 15,
        choices: caveEvents.ringOfDrownedChoice.choices,
      }}
    />,
  );
}

describe("EventDialog time bar", () => {
  beforeEach(async () => {
    await ensureGameplayLocalesLoaded(i18n, "en");
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    cleanup();
  });

  it("pulses during the last 5 seconds", async () => {
    renderTimedDialog(11);

    const bar = await screen.findByTestId("timed-dialog-time-bar");
    expect(bar.className).toContain(TIMED_EVENT_TIME_BAR_PULSE_CLASS);
  });

  it("stays still when more than 5 seconds remain", async () => {
    renderTimedDialog(0);

    const bar = await screen.findByTestId("timed-dialog-time-bar");
    expect(bar.className).not.toContain(TIMED_EVENT_TIME_BAR_PULSE_CLASS);
  });
});
