/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useGameStore } from "@/game/state";
import {
  cooldownActiveSetEqual,
  derivedListEqual,
  storeEqualsIgnoringTickClock,
  useDerivedGameState,
  useGameStoreWhileActive,
  useResourcesWhileActive,
} from "./useGameStoreWithoutTickClock";

describe("storeEqualsIgnoringTickClock", () => {
  it("treats tick-clock-only changes as equal", () => {
    const action = () => { };
    const buildings = { woodenHut: 1 };
    const a = {
      playTime: 1000,
      lifetimePlayTimeMs: 1000,
      loopProgress: 10,
      attackWaveTimers: { wave1: { elapsedTime: 1 } },
      buildings,
      executeAction: action,
    };
    const b = {
      playTime: 1250,
      lifetimePlayTimeMs: 1250,
      loopProgress: 12,
      attackWaveTimers: { wave1: { elapsedTime: 251 } },
      buildings,
      executeAction: action,
    };
    expect(storeEqualsIgnoringTickClock(a, b)).toBe(true);
  });

  it("treats remaining-time-only cooldown ticks as equal", () => {
    const buildings = { woodenHut: 1 };
    const a = {
      playTime: 1000,
      buildings,
      cooldowns: { chopWood: 5, hunt: 2.5 },
      initialCooldowns: { chopWood: 5, hunt: 8 },
    };
    const b = {
      playTime: 1250,
      buildings,
      cooldowns: { chopWood: 4.75, hunt: 2.25 },
      initialCooldowns: { chopWood: 5, hunt: 8 },
    };
    expect(storeEqualsIgnoringTickClock(a, b)).toBe(true);
  });

  it("treats a cooldown completing as unequal", () => {
    const buildings = { woodenHut: 1 };
    const a = {
      playTime: 1000,
      buildings,
      cooldowns: { chopWood: 0.25 },
      initialCooldowns: { chopWood: 5 },
    };
    const b = {
      playTime: 1250,
      buildings,
      cooldowns: { chopWood: 0 },
      initialCooldowns: {},
    };
    expect(storeEqualsIgnoringTickClock(a, b)).toBe(false);
  });

  it("treats a new cooldown starting as unequal", () => {
    const buildings = { woodenHut: 1 };
    const a = {
      playTime: 1000,
      buildings,
      cooldowns: { chopWood: 4 },
      initialCooldowns: { chopWood: 5 },
    };
    const b = {
      playTime: 1000,
      buildings,
      cooldowns: { chopWood: 4, hunt: 8 },
      initialCooldowns: { chopWood: 5, hunt: 8 },
    };
    expect(storeEqualsIgnoringTickClock(a, b)).toBe(false);
  });

  it("treats a gameplay slice change as unequal", () => {
    const a = { playTime: 1000, buildings: { woodenHut: 1 } };
    const b = { playTime: 1000, buildings: { woodenHut: 2 } };
    expect(storeEqualsIgnoringTickClock(a, b)).toBe(false);
  });
});

describe("derivedListEqual", () => {
  it("treats equal contents as equal despite new array identity", () => {
    expect(
      derivedListEqual(
        [{ sourceId: "gatherer", amount: 10 }],
        [{ sourceId: "gatherer", amount: 10 }],
      ),
    ).toBe(true);
  });

  it("treats a value change as unequal", () => {
    expect(
      derivedListEqual(
        [{ sourceId: "gatherer", amount: 10 }],
        [{ sourceId: "gatherer", amount: 11 }],
      ),
    ).toBe(false);
  });
});

describe("useDerivedGameState", () => {
  it("does not run the selector on clock or cooldown-remaining writes", () => {
    let calls = 0;
    const { result } = renderHook(() =>
      useDerivedGameState((s) => {
        calls += 1;
        return s.buildings.woodenHut ?? 0;
      }),
    );
    const afterMount = calls;
    const before = useGameStore.getState();

    try {
      act(() => {
        useGameStore.setState({
          cooldowns: { ...before.cooldowns, chopWood: 5 },
          initialCooldowns: { ...before.initialCooldowns, chopWood: 5 },
        });
      });
      const afterCooldownStart = calls;
      expect(afterCooldownStart).toBeGreaterThan(afterMount);

      act(() => {
        const current = useGameStore.getState();
        useGameStore.setState({
          playTime: current.playTime + 250,
          lifetimePlayTimeMs: (current.lifetimePlayTimeMs || 0) + 250,
          loopProgress: 40,
          attackWaveTimers: {
            ...current.attackWaveTimers,
            wave: {
              startTime: 1,
              duration: 10_000,
              elapsedTime: 1000,
              defeated: false,
              provoked: false,
            },
          },
          cooldowns: { ...current.cooldowns, chopWood: 4.75 },
          initialCooldowns: current.initialCooldowns,
        });
      });

      expect(calls).toBe(afterCooldownStart);
      expect(result.current).toBe(before.buildings.woodenHut ?? 0);

      act(() => {
        useGameStore.setState({
          cooldowns: { ...useGameStore.getState().cooldowns, chopWood: 0 },
          initialCooldowns: {},
        });
      });
      expect(calls).toBeGreaterThan(afterCooldownStart);

      const afterCooldown = calls;
      act(() => {
        useGameStore.setState({
          buildings: {
            ...useGameStore.getState().buildings,
            woodenHut: (useGameStore.getState().buildings.woodenHut ?? 0) + 1,
          },
        });
      });
      expect(calls).toBeGreaterThan(afterCooldown);
      expect(result.current).toBe(
        useGameStore.getState().buildings.woodenHut ?? 0,
      );
    } finally {
      act(() => {
        useGameStore.setState({
          playTime: before.playTime,
          lifetimePlayTimeMs: before.lifetimePlayTimeMs,
          loopProgress: before.loopProgress,
          attackWaveTimers: before.attackWaveTimers,
          cooldowns: before.cooldowns,
          initialCooldowns: before.initialCooldowns,
          buildings: before.buildings,
        });
      });
    }
  });
});

describe("hidden panel subscriptions", () => {
  it("keeps the last store snapshot while the tab is hidden", () => {
    const before = useGameStore.getState();
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useGameStoreWhileActive(active),
      { initialProps: { active: true } },
    );
    try {
      act(() => {
        useGameStore.setState({
          resources: {
            ...useGameStore.getState().resources,
            wood: before.resources.wood + 5,
          },
        });
      });
      expect(result.current.resources.wood).toBe(before.resources.wood + 5);

      rerender({ active: false });
      const frozenWood = result.current.resources.wood;
      act(() => {
        useGameStore.setState({
          resources: {
            ...useGameStore.getState().resources,
            wood: frozenWood + 5,
          },
        });
      });
      expect(result.current.resources.wood).toBe(frozenWood);

      rerender({ active: true });
      expect(result.current.resources.wood).toBe(frozenWood + 5);
    } finally {
      act(() => {
        useGameStore.setState({ resources: before.resources });
      });
    }
  });

  it("keeps the last resource slice while the tab is hidden", () => {
    const before = useGameStore.getState();
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useResourcesWhileActive(active),
      { initialProps: { active: true } },
    );
    try {
      act(() => {
        useGameStore.setState({
          resources: {
            ...useGameStore.getState().resources,
            gold: (before.resources.gold ?? 0) + 3,
          },
        });
      });
      expect(result.current.gold).toBe((before.resources.gold ?? 0) + 3);

      rerender({ active: false });
      const frozenGold = result.current.gold;
      act(() => {
        useGameStore.setState({
          resources: {
            ...useGameStore.getState().resources,
            gold: (frozenGold ?? 0) + 4,
          },
        });
      });
      expect(result.current.gold).toBe(frozenGold);

      rerender({ active: true });
      expect(result.current.gold).toBe((frozenGold ?? 0) + 4);
    } finally {
      act(() => {
        useGameStore.setState({ resources: before.resources });
      });
    }
  });
});

describe("cooldownActiveSetEqual", () => {
  it("treats the same cooling actions as equal", () => {
    expect(
      cooldownActiveSetEqual({ chopWood: 5 }, { chopWood: 4.75 }),
    ).toBe(true);
  });

  it("treats a finished cooldown as unequal", () => {
    expect(cooldownActiveSetEqual({ chopWood: 0.25 }, { chopWood: 0 })).toBe(
      false,
    );
  });
});
