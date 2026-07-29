import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { shouldShowAction } from "./index";

describe("lantern-gated explore stage visibility", () => {
  it("keeps Explore Ruins visible until exploredRuins is set, even with obsidian lantern", () => {
    const missingFlag = gameStateSchema.parse({
      tools: { steel_lantern: true, obsidian_lantern: true },
      story: { seen: { descendedFurther: true } },
    });
    expect(shouldShowAction("exploreRuins", missingFlag)).toBe(true);

    const flagSet = gameStateSchema.parse({
      tools: { steel_lantern: true, obsidian_lantern: true },
      story: { seen: { descendedFurther: true, exploredRuins: true } },
    });
    expect(shouldShowAction("exploreRuins", flagSet)).toBe(false);
  });

  it("hides Explore Ruins after flag is set while farming (no next lantern yet)", () => {
    const farming = gameStateSchema.parse({
      tools: { steel_lantern: true, obsidian_lantern: false },
      story: { seen: { exploredRuins: true } },
    });
    expect(shouldShowAction("exploreRuins", farming)).toBe(true);
  });

  it("keeps Descend Further visible until descendedFurther is set, even with steel lantern", () => {
    const missingFlag = gameStateSchema.parse({
      tools: { iron_lantern: true, steel_lantern: true },
      story: { seen: { venturedDeeper: true } },
    });
    expect(shouldShowAction("descendFurther", missingFlag)).toBe(true);
  });
});
