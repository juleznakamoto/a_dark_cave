/**
 * @vitest-environment jsdom
 */
import React from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventDialog from "./EventDialog";
import { choiceEvents } from "@/game/rules/eventsChoices";
import {
  getTooltipOpenProp,
  setGlobalTooltipsSuppressed,
} from "@/hooks/useGlobalTooltip";
import i18n from "@/i18n";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";

vi.mock("@/lib/audio", () => ({
  audioManager: {
    startEventAmbience: vi.fn(),
    stopEventAmbience: vi.fn(),
  },
  EVENT_DIALOG_AMBIENCE_FADE_SECONDS: 0,
  SOUND_VOLUME: { eventDialog: 1 },
}));

describe("EventDialog choice tooltips", () => {
  beforeEach(async () => {
    setGlobalTooltipsSuppressed(false);
    await ensureGameplayLocalesLoaded(i18n, "en");
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    setGlobalTooltipsSuppressed(false);
  });

  it("keeps Take Food hover uncontrolled while the event modal is open", async () => {
    const choices = choiceEvents.abandonedCart.choices;
    if (!Array.isArray(choices)) {
      throw new Error("abandonedCart choices should be an array");
    }

    render(
      <EventDialog
        isOpen
        onClose={() => { }}
        event={{
          id: "abandonedCart",
          message:
            "At the forest's edge, villagers find an abandoned cart with food.",
          title: "The Abandoned Cart",
          type: "event",
          timestamp: 0,
          choices,
        }}
      />,
    );

    expect(await screen.findByRole("button", { name: /Take Food/i })).toBeTruthy();
    const trigger = document.querySelector(
      '[data-tooltip-trigger-id="event-choice-takeFood"]',
    );
    expect(trigger).toBeTruthy();
    expect(trigger?.closest('[role="dialog"]')).toBeTruthy();

    act(() => {
      setGlobalTooltipsSuppressed(true);
    });

    expect(getTooltipOpenProp("event-choice-takeFood")).toBeUndefined();
  });
});
