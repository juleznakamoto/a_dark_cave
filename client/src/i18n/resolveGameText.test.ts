import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import { tWithFallback } from "./resolveGameText";

describe("tWithFallback", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("interpolates i18next-style double-brace placeholders in fallback strings", () => {
    const result = tWithFallback(
      "ui",
      "missing.achievements.completeLog",
      "{{name}} Achievement complete: {{rewards}}",
      { name: "John", rewards: "+250 Silver" },
    );

    expect(result).toBe("John Achievement complete: +250 Silver");
  });

  it("still interpolates single-brace placeholders in fallback strings", () => {
    const result = tWithFallback(
      "ui",
      "missing.cave.abortForGold",
      "Abort for {amount} Gold",
      { amount: 25 },
    );

    expect(result).toBe("Abort for 25 Gold");
  });

  it("uses catalog translation when the key exists", async () => {
    await i18n.changeLanguage("de");
    const result = tWithFallback(
      "ui",
      "achievements.completeLog",
      "{{name}} Achievement complete: {{rewards}}",
      { name: "Holzfäller", rewards: "+250 Silber" },
    );

    expect(result).toBe("Erfolg abgeschlossen: Holzfäller: +250 Silber");
  });

  it("resolves plural catalog keys when exists() is false", async () => {
    expect(i18n.exists("ui:tooltips.villagerCost")).toBe(false);
    expect(
      tWithFallback("ui", "tooltips.villagerCost", "-{{count}} Villager", {
        count: 1,
      }),
    ).toBe("-1 Villager");
    await i18n.changeLanguage("de");
    expect(
      tWithFallback("ui", "tooltips.villagerCost", "-{{count}} Villager", {
        count: 1,
      }),
    ).toBe("-1 Dorfbewohner");
  });
});
