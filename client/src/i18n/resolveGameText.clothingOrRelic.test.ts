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
});
