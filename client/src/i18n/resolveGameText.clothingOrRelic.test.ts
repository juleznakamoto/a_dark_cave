import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import { getClothingOrRelicEffectName } from "./resolveGameText";

describe("getClothingOrRelicEffectName", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("resolves clothing-state items from effects.clothing catalog", () => {
    expect(getClothingOrRelicEffectName("muttering_amulet")).toBe(
      "Muttering Amulet",
    );
  });

  it("resolves relic-state items from effects.clothing catalog (not effects.relics)", () => {
    expect(getClothingOrRelicEffectName("hollow_king_scepter")).toBe(
      "Hollow King Scepter",
    );
    expect(getClothingOrRelicEffectName("shadow_flute")).toBe("Shadow Flute");
  });

  it("title-cases unknown ids via fallback", () => {
    expect(getClothingOrRelicEffectName("unknown_item_id")).toBe(
      "Unknown Item Id",
    );
  });

  it("falls back to title-cased id when effect name is empty", async () => {
    const { clothingEffects } = await import("@/game/rules/effects");
    const original = clothingEffects.test_empty_name?.name;
    clothingEffects.test_empty_name = {
      id: "test_empty_name",
      name: "",
      description: "",
      bonuses: {},
    };
    try {
      expect(getClothingOrRelicEffectName("test_empty_name")).toBe(
        "Test Empty Name",
      );
    } finally {
      if (original === undefined) {
        delete clothingEffects.test_empty_name;
      } else {
        clothingEffects.test_empty_name!.name = original;
      }
    }
  });
});
