import { describe, it, expect, beforeEach } from "vitest";
import {
  STAT_INSIGHT_REVEAL_KEY,
  TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
  TIMED_EVENT_TAB_PROLONG_MS,
} from "./rules/insightReveal";
import { createInitialState, useGameStore } from "./state";
describe("revealActionEffects", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("deducts insight and starts reveal cooldown when affordable", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 100,
      },
    });

    const ok = useGameStore.getState().revealActionEffects("craftStoneAxe");
    expect(ok).toBe(true);

    const after = useGameStore.getState();
    expect(after.resources.insight).toBe(75);
    expect(after.cooldowns.craftStoneAxe).toBe(3);
    expect(after.initialCooldowns.craftStoneAxe).toBe(3);
    expect(after.insightRevealing.craftStoneAxe).toBeGreaterThan(Date.now());
  });

  it("does nothing when insight is insufficient", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 5,
      },
    });

    const ok = useGameStore.getState().revealActionEffects("craftStoneAxe");
    expect(ok).toBe(false);
    expect(useGameStore.getState().resources.insight).toBe(5);
    expect(useGameStore.getState().insightRevealing.craftStoneAxe).toBeUndefined();
  });

  it("does nothing before Clerks Hut is built", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 0,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 100,
      },
    });

    const ok = useGameStore.getState().revealActionEffects("craftStoneAxe");
    expect(ok).toBe(false);
    expect(useGameStore.getState().resources.insight).toBe(100);
    expect(useGameStore.getState().insightRevealing.craftStoneAxe).toBeUndefined();
  });

  it("moves action into revealedEffects after reveal window", () => {
    useGameStore.setState({
      resources: {
        ...useGameStore.getState().resources,
        insight: 50,
      },
      insightRevealing: {
        craftStoneAxe: Date.now() - 1,
      },
      revealedEffects: [],
    });

    useGameStore.getState().tickCooldowns();

    const after = useGameStore.getState();
    expect(after.revealedEffects).toContain("craftStoneAxe");
    expect(after.insightRevealing.craftStoneAxe).toBeUndefined();
  });
});

describe("revealStatEffects", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("deducts insight and starts reveal animation before statEffectsRevealed", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 600,
      },
    });

    const ok = useGameStore.getState().revealStatEffects();
    expect(ok).toBe(true);

    const after = useGameStore.getState();
    expect(after.resources.insight).toBe(100);
    expect(after.statEffectsRevealed).toBeFalsy();
    expect(after.insightRevealing[STAT_INSIGHT_REVEAL_KEY]).toBeGreaterThan(
      Date.now(),
    );
  });

  it("sets statEffectsRevealed after reveal window", () => {
    useGameStore.setState({
      statEffectsRevealed: false,
      insightRevealing: {
        [STAT_INSIGHT_REVEAL_KEY]: Date.now() - 1,
      },
    });

    useGameStore.getState().tickCooldowns();

    const after = useGameStore.getState();
    expect(after.statEffectsRevealed).toBe(true);
    expect(after.insightRevealing[STAT_INSIGHT_REVEAL_KEY]).toBeUndefined();
  });
});

describe("prolongTimedEventTab", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("extends expiry and deducts insight when affordable", () => {
    const expiryTime = Date.now() + 60_000;
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 300,
      },
      timedEventTab: {
        isActive: true,
        event: { id: "merchant-test", message: "m", title: "t" },
        expiryTime,
        startTime: Date.now(),
        pauseAccumMs: 0,
        pauseStartedAt: 0,
      },
    });

    const ok = useGameStore.getState().prolongTimedEventTab();
    expect(ok).toBe(true);

    const after = useGameStore.getState();
    expect(after.resources.insight).toBe(
      300 - TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
    );
    expect(after.timedEventTab.expiryTime).toBe(
      expiryTime + TIMED_EVENT_TAB_PROLONG_MS,
    );
    expect(after.timedEventTab.insightProlongUsed).toBe(true);
  });

  it("cannot prolong twice in the same timed-tab visit", () => {
    const expiryTime = Date.now() + 60_000;
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 600,
      },
      timedEventTab: {
        isActive: true,
        event: { id: "merchant-test", message: "m", title: "t" },
        expiryTime,
        startTime: Date.now(),
        pauseAccumMs: 0,
        pauseStartedAt: 0,
        insightProlongUsed: true,
      },
    });

    expect(useGameStore.getState().prolongTimedEventTab()).toBe(false);
    expect(useGameStore.getState().resources.insight).toBe(600);
    expect(useGameStore.getState().timedEventTab.expiryTime).toBe(expiryTime);
  });

  it("does nothing without Clerks Hut or insufficient insight", () => {
    const expiryTime = Date.now() + 60_000;
    useGameStore.setState({
      resources: {
        ...useGameStore.getState().resources,
        insight: 100,
      },
      timedEventTab: {
        isActive: true,
        event: { id: "merchant-test", message: "m", title: "t" },
        expiryTime,
        startTime: Date.now(),
      },
    });

    expect(useGameStore.getState().prolongTimedEventTab()).toBe(false);
    expect(useGameStore.getState().timedEventTab.expiryTime).toBe(expiryTime);

    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 10,
      },
    });
    expect(useGameStore.getState().prolongTimedEventTab()).toBe(false);
  });
});

describe("createInitialState insight fields", () => {
  it("includes insight, scholar, and revealedEffects defaults", () => {
    const state = createInitialState();
    expect(state.resources.insight).toBe(0);
    expect(state.villagers.scholar).toBe(0);
    expect(state.revealedEffects).toEqual([]);
  });
});
