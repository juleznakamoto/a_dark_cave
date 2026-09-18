/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CooldownButton from "./CooldownButton";
import { useGameStore } from "@/game/state";
import { ADC_PROGRESS_WIPE_FILL_CLASS } from "@/lib/uiClock";

describe("CooldownButton execution wash", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("uses a CSS wipe for execution instead of a 100ms forceUpdate poll", () => {
    const start = Date.now() - 5_000;
    useGameStore.setState({
      executionStartTimes: { gatherWood: start },
      executionDurations: { gatherWood: 60 },
    });

    const setIntervalSpy = vi.spyOn(window, "setInterval");

    render(
      <CooldownButton
        button_id="gatherWood"
        cooldownMs={0}
        onClick={() => {}}
        data-testid="button-gather-wood"
      >
        Gather Wood
      </CooldownButton>,
    );

    const wash = document.querySelector(`.${ADC_PROGRESS_WIPE_FILL_CLASS}`);
    expect(wash).toBeTruthy();
    expect((wash as HTMLElement).style.animationDuration).toBe("60000ms");
    const delayMs = Number.parseInt(
      (wash as HTMLElement).style.animationDelay,
      10,
    );
    expect(delayMs).toBeLessThanOrEqual(-5000);
    expect(delayMs).toBeGreaterThan(-5500);

    expect(
      setIntervalSpy.mock.calls.filter(([, ms]) => ms === 100),
    ).toHaveLength(0);
  });

  it("does not start N 100ms polls for N concurrent executions", () => {
    const now = Date.now();
    const executionStartTimes: Record<string, number> = {};
    const executionDurations: Record<string, number> = {};
    const ids = Array.from({ length: 24 }, (_, i) => `craftItem${i}`);
    for (const id of ids) {
      executionStartTimes[id] = now;
      executionDurations[id] = 30;
    }
    useGameStore.setState({ executionStartTimes, executionDurations });

    const setIntervalSpy = vi.spyOn(window, "setInterval");

    render(
      <>
        {ids.map((id) => (
          <CooldownButton
            key={id}
            button_id={id}
            cooldownMs={0}
            onClick={() => {}}
            data-testid={`button-${id}`}
          >
            Craft
          </CooldownButton>
        ))}
      </>,
    );

    expect(document.querySelectorAll(`.${ADC_PROGRESS_WIPE_FILL_CLASS}`)).toHaveLength(
      24,
    );
    expect(
      setIntervalSpy.mock.calls.filter(([, ms]) => ms === 100),
    ).toHaveLength(0);
  });

  it("keeps store-driven play-time overlays on width, not the CSS execution wipe", () => {
    render(
      <CooldownButton
        button_id="callMerchant"
        cooldownMs={0}
        onClick={() => {}}
        data-testid="button-call-merchant"
        playTimeCooldown={{
          startPlayTime: 0,
          endPlayTime: 10_000,
          mode: "progress",
        }}
      >
        Call Merchant
      </CooldownButton>,
    );

    const button = screen.getByTestId("button-call-merchant");
    expect(button.querySelector(`.${ADC_PROGRESS_WIPE_FILL_CLASS}`)).toBeNull();
    const wash = button.querySelector("div.pointer-events-none.absolute.inset-0");
    expect(wash).toBeTruthy();
    expect((wash as HTMLElement).style.width).toBe("0%");
  });
});
