import { beforeEach, describe, expect, it, vi } from "vitest";
import { audioManager } from "@/lib/audio";
import { buildDevSave } from "@/game/devSaves";
import { VILLAGE_MAP_POSITIONS } from "@/game/villageMapLayout";
import { useGameStore } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  VILLAGE_SILVER_CAP,
  VILLAGE_SILVER_COIN_REACH,
  VILLAGE_SILVER_MAX_MS,
  VILLAGE_SILVER_MIN_MS,
  isVillageSilverSpotOpen,
  tickVillageMapSilver,
  villageMapCoinMetal,
  villageSilverCoinReward,
  villageSilverDelayMs,
  type VillageSilverCoin,
} from "@/game/villageMapSilver";

function withMap(state: GameState, playTime = state.playTime): GameState {
  return {
    ...state,
    playTime,
    flags: { ...state.flags, mapUnlocked: true },
    villageSilverCoins: [],
    villageSilverNextAt: 0,
  };
}

describe("village silver coin reward", () => {
  it("pays from wooden huts, then stone huts", () => {
    expect(villageSilverCoinReward(0, 0)).toBe(5);
    expect(villageSilverCoinReward(5, 0)).toBe(5);
    expect(villageSilverCoinReward(6, 0)).toBe(10);
    expect(villageSilverCoinReward(10, 0)).toBe(10);
    expect(villageSilverCoinReward(12, 0)).toBe(10);
    expect(villageSilverCoinReward(12, 1)).toBe(25);
    expect(villageSilverCoinReward(2, 5)).toBe(25);
    expect(villageSilverCoinReward(2, 6)).toBe(50);
    expect(villageSilverCoinReward(0, 10)).toBe(50);
    expect(villageSilverCoinReward(0, 12)).toBe(50);
  });

  it("waits between 5 and 11 minutes", () => {
    expect(villageSilverDelayMs(() => 0)).toBe(VILLAGE_SILVER_MIN_MS);
    const late = villageSilverDelayMs(() => 0.999999);
    expect(late).toBeGreaterThan(VILLAGE_SILVER_MAX_MS - 5);
    expect(late).toBeLessThanOrEqual(VILLAGE_SILVER_MAX_MS);
  });

  it("makes one spawn in ten a gold coin", () => {
    expect(villageMapCoinMetal(() => 0)).toBe("gold");
    expect(villageMapCoinMetal(() => 0.099)).toBe("gold");
    expect(villageMapCoinMetal(() => 0.1)).toBe("silver");
    expect(villageMapCoinMetal(() => 0.99)).toBe("silver");
  });
});

describe("village silver coin spawns", () => {
  it("does nothing until the map is unlocked", () => {
    const state = buildDevSave("village");
    expect(tickVillageMapSilver(state, () => 0)).toBeNull();
  });

  it("arms a wait instead of dropping a coin immediately", () => {
    const state = withMap(buildDevSave("village"), 1_000);
    expect(tickVillageMapSilver(state, () => 0)).toEqual({
      villageSilverNextAt: 1_000 + VILLAGE_SILVER_MIN_MS,
    });
  });

  it("places up to three coins on open ground, then waits for a pickup", () => {
    let state = withMap(buildDevSave("bastion"), 0);
    const coins: VillageSilverCoin[] = [];
    for (let index = 0; index < VILLAGE_SILVER_CAP; index++) {
      state = {
        ...state,
        playTime: state.villageSilverNextAt > 0 ? state.villageSilverNextAt : 1,
        villageSilverNextAt: state.villageSilverNextAt > 0 ? state.villageSilverNextAt : 1,
        villageSilverCoins: coins,
      };
      const patch = tickVillageMapSilver(state, () => 0.41 + index * 0.05);
      expect(patch?.villageSilverCoins).toHaveLength(index + 1);
      expect(patch?.villageSilverCoins?.[index]?.metal).toBe("silver");
      coins.splice(0, coins.length, ...(patch?.villageSilverCoins ?? []));
      state = { ...state, ...patch, villageSilverCoins: coins };
    }

    for (const coin of coins) {
      const others = coins.filter((other) => other.id !== coin.id);
      expect(isVillageSilverSpotOpen(state, coin, others)).toBe(true);
    }
    for (let i = 0; i < coins.length; i++) {
      for (let j = i + 1; j < coins.length; j++) {
        const gap = Math.hypot(coins[i].x - coins[j].x, coins[i].y - coins[j].y);
        expect(gap).toBeGreaterThanOrEqual(VILLAGE_SILVER_COIN_REACH * 2);
      }
    }

    const held = tickVillageMapSilver(
      { ...state, playTime: 9_999_999, villageSilverNextAt: 1, villageSilverCoins: coins },
      () => 0.2,
    );
    expect(held).toEqual({ villageSilverNextAt: 0 });

    const afterPickup = tickVillageMapSilver(
      { ...state, playTime: 20_000, villageSilverNextAt: 0, villageSilverCoins: coins.slice(0, 2) },
      () => 0,
    );
    expect(afterPickup?.villageSilverCoins).toBeUndefined();
    expect(afterPickup?.villageSilverNextAt).toBe(20_000 + VILLAGE_SILVER_MIN_MS);
  });

  it("spawns a gold coin when the roll is under one in ten", () => {
    let state = withMap(buildDevSave("bastion"), 1_000);
    state = { ...state, ...tickVillageMapSilver(state, () => 0.05) };
    const patch = tickVillageMapSilver(
      { ...state, playTime: state.villageSilverNextAt },
      () => 0.05,
    );
    expect(patch?.villageSilverCoins).toHaveLength(1);
    expect(patch?.villageSilverCoins?.[0]?.metal).toBe("gold");
  });

  it("does not land on a hut", () => {
    const state = withMap(buildDevSave("village"));
    const hut = VILLAGE_MAP_POSITIONS["woodenHut:0"];
    expect(isVillageSilverSpotOpen(state, hut)).toBe(false);
  });
});

describe("collect village silver coin", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("grants silver, removes the coin, and plays the purchase sound", () => {
    const play = vi.spyOn(audioManager, "playSound").mockImplementation(() => {});
    const buildings = useGameStore.getState().buildings;
    const resources = useGameStore.getState().resources;
    useGameStore.setState({
      buildings: { ...buildings, woodenHut: 8, stoneHut: 4 },
      resources: { ...resources, silver: 10 },
      villageSilverCoins: [{ id: "coin-a", x: 10, y: 20 }],
    });

    useGameStore.getState().collectVillageSilverCoin("missing");
    expect(useGameStore.getState().resources.silver).toBe(10);
    expect(play).not.toHaveBeenCalled();

    useGameStore.getState().collectVillageSilverCoin("coin-a");
    expect(useGameStore.getState().resources.silver).toBe(35);
    expect(useGameStore.getState().villageSilverCoins).toEqual([]);
    expect(useGameStore.getState().resourceChangeEvents.at(-1)?.resource).toBe("silver");
    expect(useGameStore.getState().resourceChangeEvents.at(-1)?.amount).toBe(25);
    expect(play).toHaveBeenCalledWith("purchase", expect.any(Number));
    play.mockRestore();
  });

  it("pays a gold coin the same amount in gold", () => {
    const play = vi.spyOn(audioManager, "playSound").mockImplementation(() => {});
    const buildings = useGameStore.getState().buildings;
    const resources = useGameStore.getState().resources;
    useGameStore.setState({
      buildings: { ...buildings, woodenHut: 8, stoneHut: 4 },
      resources: { ...resources, silver: 10, gold: 3 },
      villageSilverCoins: [{ id: "coin-gold", x: 10, y: 20, metal: "gold" }],
    });

    useGameStore.getState().collectVillageSilverCoin("coin-gold");
    expect(useGameStore.getState().resources.silver).toBe(10);
    expect(useGameStore.getState().resources.gold).toBe(28);
    expect(useGameStore.getState().villageSilverCoins).toEqual([]);
    expect(useGameStore.getState().resourceChangeEvents.at(-1)?.resource).toBe("gold");
    expect(useGameStore.getState().resourceChangeEvents.at(-1)?.amount).toBe(25);
    expect(play).toHaveBeenCalledWith("purchase", expect.any(Number));
    play.mockRestore();
  });
});
