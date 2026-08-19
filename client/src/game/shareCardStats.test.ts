import { describe, expect, it } from "vitest";
import { hasReachedFirstAttackWaves } from "./shareCardStats";

describe("hasReachedFirstAttackWaves", () => {
  it("is false before Bastion and Blast Gate", () => {
    expect(hasReachedFirstAttackWaves({}, 0)).toBe(false);
    expect(hasReachedFirstAttackWaves({ portalBlasted: true }, 0)).toBe(false);
    expect(hasReachedFirstAttackWaves({}, 1)).toBe(false);
  });

  it("is true once first wave can start or was fought", () => {
    expect(hasReachedFirstAttackWaves({ portalBlasted: true }, 1)).toBe(true);
    expect(hasReachedFirstAttackWaves({ firstWaveTriggered: true }, 0)).toBe(
      true,
    );
    expect(hasReachedFirstAttackWaves({ firstWaveVictory: true }, 0)).toBe(
      true,
    );
    expect(hasReachedFirstAttackWaves({ firstWaveDefeat: true }, 0)).toBe(true);
    expect(hasReachedFirstAttackWaves({}, 0, 1)).toBe(true);
  });
});
