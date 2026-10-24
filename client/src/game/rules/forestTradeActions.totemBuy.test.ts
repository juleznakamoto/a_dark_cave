import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { executeGameAction } from "@/game/actions";
import "@/game/rules";
import { shouldShowAction } from "./index";

function totemBuyState(won: boolean) {
  return gameStateSchema.parse({
    resources: { gold: 10_000, bone_totem: 0, leather_totem: 0 },
    story: { seen: won ? { secondBossWaveVictory: true } : {} },
  });
}

describe("post-game forest totem buys", () => {
  it("stays hidden until the last wave is won", () => {
    const before = totemBuyState(false);
    const after = totemBuyState(true);

    expect(shouldShowAction("tradeGoldForBoneTotems", before)).toBe(false);
    expect(shouldShowAction("tradeGoldForLeatherTotems", before)).toBe(false);
    expect(shouldShowAction("tradeGoldForBoneTotems", after)).toBe(true);
    expect(shouldShowAction("tradeGoldForLeatherTotems", after)).toBe(true);
  });

  it("sells 250 bone totems for 1250 gold", () => {
    const state = totemBuyState(true);
    const result = executeGameAction("tradeGoldForBoneTotems", state);

    expect(result.stateUpdates.resources?.bone_totem).toBe(250);
    expect(result.stateUpdates.resources?.gold).toBe(10_000 - 1250);
    expect(result.stateUpdates.cooldowns?.tradeGoldForBoneTotems).toBe(5);
  });

  it("sells 250 leather totems for 3750 gold", () => {
    const state = totemBuyState(true);
    const result = executeGameAction("tradeGoldForLeatherTotems", state);

    expect(result.stateUpdates.resources?.leather_totem).toBe(250);
    expect(result.stateUpdates.resources?.gold).toBe(10_000 - 3750);
    expect(result.stateUpdates.cooldowns?.tradeGoldForLeatherTotems).toBe(5);
  });
});
