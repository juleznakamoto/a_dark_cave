/**
 * @vitest-environment jsdom
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CooldownButton, {
  gameActionOutlineButtonClassName,
} from "./CooldownButton";
import { useGameStore } from "@/game/state";
import {
  ADC_PROGRESS_WIPE_FILL_CLASS,
  ADC_PROGRESS_WIPE_PAUSED_CLASS,
  ADC_PROGRESS_WIPE_RECEDE_CLASS,
} from "@/lib/uiClock";

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
        onClick={() => { }}
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
    const widthPct = Number.parseFloat((wash as HTMLElement).style.width);
    expect(widthPct).toBeGreaterThan(8);
    expect(widthPct).toBeLessThan(10);

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
            onClick={() => { }}
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
        onClick={() => { }}
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
    const wash = button.querySelector("div.pointer-events-none.absolute");
    expect(wash).toBeTruthy();
    expect((wash as HTMLElement).style.width).toBe("0%");
  });

  it("puts cracked outline on Button, not the action helper", () => {
    const helper = gameActionOutlineButtonClassName(false);
    expect(helper).toContain("border-orange-950");
    expect(helper).not.toContain("game-chrome-rule--box");

    render(
      <CooldownButton
        variant="outline"
        button_id="gatherWood"
        cooldownMs={0}
        onClick={() => { }}
        data-testid="button-gather-wood"
      >
        Gather Wood
      </CooldownButton>,
    );

    const button = screen.getByTestId("button-gather-wood");
    expect(button.className).toContain("game-chrome-rule--box");
    expect(button.className).toContain("border-transparent");
    expect(button.className).not.toContain("border-orange-950");
    expect(button.style.getPropertyValue("--adc-chrome-mask-x")).toMatch(
      /^\d+px$/,
    );
  });

  it("does not rewrite execution animation-delay when unrelated store fields change", () => {
    const start = Date.now() - 5_000;
    useGameStore.setState({
      executionStartTimes: { gatherWood: start },
      executionDurations: { gatherWood: 60 },
    });

    render(
      <CooldownButton
        button_id="gatherWood"
        cooldownMs={0}
        onClick={() => { }}
        data-testid="button-gather-wood"
      >
        Gather Wood
      </CooldownButton>,
    );

    const wash = document.querySelector(`.${ADC_PROGRESS_WIPE_FILL_CLASS}`);
    expect(wash).toBeTruthy();
    const delayBefore = (wash as HTMLElement).style.animationDelay;

    act(() => {
      useGameStore.setState({
        resources: { ...useGameStore.getState().resources, gold: 99 },
      });
    });

    const washAfter = document.querySelector(`.${ADC_PROGRESS_WIPE_FILL_CLASS}`);
    expect(washAfter).toBeTruthy();
    expect((washAfter as HTMLElement).style.animationDelay).toBe(delayBefore);
  });

  it("uses a CSS recede wipe for action cooldown instead of remaining-time width ticks", () => {
    useGameStore.setState({
      cooldowns: { gatherWood: 3 },
      initialCooldowns: { gatherWood: 4 },
    });

    render(
      <CooldownButton
        button_id="gatherWood"
        cooldownMs={4000}
        onClick={() => { }}
        data-testid="button-gather-wood"
      >
        Gather Wood
      </CooldownButton>,
    );

    const wash = document.querySelector(`.${ADC_PROGRESS_WIPE_RECEDE_CLASS}`);
    expect(wash).toBeTruthy();
    expect((wash as HTMLElement).style.animationDuration).toBe("4000ms");
    const delayMs = Number.parseInt((wash as HTMLElement).style.animationDelay, 10);
    expect(delayMs).toBeLessThanOrEqual(-1000);
    expect(delayMs).toBeGreaterThan(-1400);
    const durationMs = Number.parseInt((wash as HTMLElement).style.animationDuration, 10);
    expect(durationMs + delayMs).toBeGreaterThanOrEqual(2600);
    expect(durationMs + delayMs).toBeLessThanOrEqual(3000);

    act(() => {
      useGameStore.setState({
        cooldowns: { gatherWood: 2 },
        initialCooldowns: { gatherWood: 4 },
      });
    });

    const washAfterTick = document.querySelector(`.${ADC_PROGRESS_WIPE_RECEDE_CLASS}`);
    expect(washAfterTick).toBeTruthy();
    expect((washAfterTick as HTMLElement).style.animationDelay).toBe(
      (wash as HTMLElement).style.animationDelay,
    );
  });

  it("pauses the CSS wipe while the player has the game paused", () => {
    const start = Date.now() - 1_000;
    useGameStore.setState({
      isPaused: true,
      executionStartTimes: { gatherWood: start },
      executionDurations: { gatherWood: 60 },
    });

    render(
      <CooldownButton
        button_id="gatherWood"
        cooldownMs={0}
        onClick={() => { }}
        data-testid="button-gather-wood"
      >
        Gather Wood
      </CooldownButton>,
    );

    const wash = document.querySelector(`.${ADC_PROGRESS_WIPE_FILL_CLASS}`);
    expect(wash).toBeTruthy();
    expect((wash as HTMLElement).className).toContain(
      ADC_PROGRESS_WIPE_PAUSED_CLASS,
    );
  });

  it("completes an overdue execution without waiting for the 4 Hz loop", () => {
    const now = Date.now();
    useGameStore.setState({
      flags: { ...useGameStore.getState().flags, gameStarted: true },
      executionStartTimes: { chopWood: now - 10_000 },
      executionDurations: { chopWood: 4 },
      resources: { ...useGameStore.getState().resources, wood: 0 },
    });

    render(
      <CooldownButton
        button_id="chopWood"
        cooldownMs={0}
        onClick={() => { }}
        data-testid="button-chop-wood"
      >
        Chop Wood
      </CooldownButton>,
    );

    expect(useGameStore.getState().executionStartTimes?.chopWood).toBeUndefined();
    expect(useGameStore.getState().resources.wood).toBeGreaterThan(0);
  });

  it("does not complete an overdue execution while a visible modal is open", () => {
    const start = Date.now() - 10_000;
    useGameStore.setState({
      flags: { ...useGameStore.getState().flags, gameStarted: true },
      eventDialog: {
        isOpen: true,
        currentEvent: {
          id: "test-event",
          message: "Test",
          timestamp: Date.now(),
          type: "event",
          skipSound: true,
        },
        lastEndedAt: 0,
      },
      executionStartTimes: { chopWood: start },
      executionDurations: { chopWood: 4 },
      resources: { ...useGameStore.getState().resources, wood: 0 },
    });

    render(
      <CooldownButton
        button_id="chopWood"
        cooldownMs={0}
        onClick={() => { }}
        data-testid="button-chop-wood"
      >
        Chop Wood
      </CooldownButton>,
    );

    expect(useGameStore.getState().executionStartTimes?.chopWood).toBe(start);
    expect(useGameStore.getState().resources.wood).toBe(0);
  });

  it("completes an overdue execution during dialog handoff", () => {
    const now = Date.now();
    useGameStore.setState({
      flags: { ...useGameStore.getState().flags, gameStarted: true },
      dialogHandoffPending: true,
      executionStartTimes: { chopWood: now - 10_000 },
      executionDurations: { chopWood: 4 },
      resources: { ...useGameStore.getState().resources, wood: 0 },
    });

    render(
      <CooldownButton
        button_id="chopWood"
        cooldownMs={0}
        onClick={() => { }}
        data-testid="button-chop-wood"
      >
        Chop Wood
      </CooldownButton>,
    );

    expect(useGameStore.getState().executionStartTimes?.chopWood).toBeUndefined();
    expect(useGameStore.getState().resources.wood).toBeGreaterThan(0);
  });

  it("does not pause an in-flight execution wipe during dialog handoff", () => {
    const start = Date.now() - 1_000;
    useGameStore.setState({
      dialogHandoffPending: true,
      executionStartTimes: { gatherWood: start },
      executionDurations: { gatherWood: 60 },
    });

    render(
      <CooldownButton
        button_id="gatherWood"
        cooldownMs={0}
        onClick={() => { }}
        data-testid="button-gather-wood"
      >
        Gather Wood
      </CooldownButton>,
    );

    const wash = document.querySelector(`.${ADC_PROGRESS_WIPE_FILL_CLASS}`);
    expect(wash).toBeTruthy();
    expect((wash as HTMLElement).className).not.toContain(
      ADC_PROGRESS_WIPE_PAUSED_CLASS,
    );
  });

  it("pauses a cooldown wipe during dialog handoff so it cannot run ahead of ticks", () => {
    useGameStore.setState({
      dialogHandoffPending: true,
      cooldowns: { gatherWood: 3 },
      initialCooldowns: { gatherWood: 4 },
    });

    render(
      <CooldownButton
        button_id="gatherWood"
        cooldownMs={4000}
        onClick={() => { }}
        data-testid="button-gather-wood"
      >
        Gather Wood
      </CooldownButton>,
    );

    const wash = document.querySelector(`.${ADC_PROGRESS_WIPE_RECEDE_CLASS}`);
    expect(wash).toBeTruthy();
    expect((wash as HTMLElement).className).toContain(
      ADC_PROGRESS_WIPE_PAUSED_CLASS,
    );
    const delayBefore = (wash as HTMLElement).style.animationDelay;

    act(() => {
      useGameStore.setState({ dialogHandoffPending: false });
    });

    const washAfter = document.querySelector(`.${ADC_PROGRESS_WIPE_RECEDE_CLASS}`);
    expect(washAfter).toBeTruthy();
    expect((washAfter as HTMLElement).className).not.toContain(
      ADC_PROGRESS_WIPE_PAUSED_CLASS,
    );
    const delayAfter = Number.parseInt(
      (washAfter as HTMLElement).style.animationDelay,
      10,
    );
    const delayBeforeMs = Number.parseInt(delayBefore, 10);
    expect(delayAfter).toBeGreaterThan(delayBeforeMs - 200);
    expect(delayAfter).toBeLessThanOrEqual(-1000);
  });
});
