import { afterAll, beforeAll, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { formatPercent } from "@/i18n/resolveGameText";
import { getUiTooltip } from "@/i18n/tooltipLabels";

describe("locale-aware percent and fortification stat lines", () => {
  beforeAll(async () => {
    await ensureGameplayLocalesLoaded();
  });

  afterAll(async () => {
    await i18n.changeLanguage("en");
  });

  it("puts the percent sign where each locale expects it", async () => {
    await i18n.changeLanguage("en");
    expect(formatPercent(70)).toBe("70%");
    await i18n.changeLanguage("tr");
    expect(formatPercent(70)).toBe("%70");
    await i18n.changeLanguage("de");
    expect(formatPercent(70)).toBe("70 %");
  });

  it("translates fortification stat lines instead of using the English fallback", async () => {
    await i18n.changeLanguage("tr");
    expect(getUiTooltip("integrityBonus", "{{amount}} Integrity", { amount: 30 })).toBe(
      "30 Sağlamlık",
    );
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      await i18n.changeLanguage(locale);
      for (const [key, fallback] of [
        ["attackBonus", "{{amount}} Attack"],
        ["defenseBonus", "{{amount}} Defense"],
        ["integrityBonus", "{{amount}} Integrity"],
      ] as const) {
        const line = getUiTooltip(key, fallback, { amount: 10 });
        expect(line, `${locale} ${key}`).toContain("10");
        expect(line, `${locale} ${key}`).not.toMatch(/Attack|Defense|Integrity/);
      }
    }
  }, 30_000);
});
