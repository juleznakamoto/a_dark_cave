import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { shouldShowAction } from "./index";

const BLACKSTEEL_CRAFTS = [
  "craftBlacksteelAxe",
  "craftBlacksteelPickaxe",
  "craftBlacksteelLantern",
  "craftBlacksteelArmor",
  "craftBlacksteelSword",
  "craftBlacksteelBow",
] as const;

describe("blacksteel craft visibility", () => {
  it("shows Grand Blacksmith only with Prime Foundry and Bottomless Pit", () => {
    const missingPit = gameStateSchema.parse({
      buildings: {
        stoneHut: 5,
        advancedBlacksmith: 1,
        primeFoundry: 1,
        bottomlessPit: 0,
        grandBlacksmith: 0,
      },
    });
    expect(shouldShowAction("buildGrandBlacksmith", missingPit)).toBe(false);

    const ready = gameStateSchema.parse({
      buildings: {
        stoneHut: 5,
        advancedBlacksmith: 1,
        primeFoundry: 1,
        bottomlessPit: 1,
        grandBlacksmith: 0,
      },
    });
    expect(shouldShowAction("buildGrandBlacksmith", ready)).toBe(true);
  });

  it("shows blacksteel crafts after Grand Blacksmith without Masterwork Foundry", () => {
    const withGrand = gameStateSchema.parse({
      buildings: { grandBlacksmith: 1, masterworkFoundry: 0 },
    });
    for (const id of BLACKSTEEL_CRAFTS) {
      expect(shouldShowAction(id, withGrand)).toBe(true);
    }
  });
});
