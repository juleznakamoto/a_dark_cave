import { describe, it, expect, beforeEach } from "vitest";
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

describe("createInitialState insight fields", () => {
  it("includes insight, scholar, and revealedEffects defaults", () => {
    const state = createInitialState();
    expect(state.resources.insight).toBe(0);
    expect(state.villagers.scholar).toBe(0);
    expect(state.revealedEffects).toEqual([]);
  });
});
