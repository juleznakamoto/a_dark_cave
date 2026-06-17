import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import { getEnUiCatalogString } from "./enUiCatalog";
import {
  getActionLabel,
  getCatalogString,
  getEffectName,
  getEventMessage,
  tWithFallback,
} from "./resolveGameText";
import { getUiTooltip } from "./tooltipLabels";
import { resolveEventMessage, resolveEventTitle } from "./eventText";
import { gameStateSchema } from "@shared/schema";
import { getActionCostBreakdown } from "@/game/rules/index";

describe("i18n runtime", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("loads German village panel strings", async () => {
    await i18n.changeLanguage("de");
    expect(i18n.t("village.sectionProduce", { ns: "ui" })).toBe("Produzieren");
    expect(i18n.t("village.villagers", { ns: "ui" })).toBe("Dorfbewohner");
    expect(i18n.t("village.villagersAvailable", { ns: "ui" })).toBe(
      "verfügbar",
    );
    expect(i18n.t("village.villagersOnMission", { ns: "ui" })).toBe(
      "auf Mission",
    );
    expect(getCatalogString("en", "ui", "village.villagers")).toBe("Villagers");
  });

  it("loads English UI strings", () => {
    expect(getEnUiCatalogString("village.presetSlotsPurchase")).toBe(
      "Add 2 more preset slots",
    );
    expect(i18n.t("profile.save", { ns: "ui" })).toBe("Save");
    expect(i18n.t("estate.improve", { ns: "ui" })).toBe("Improve");
    expect(i18n.t("estate.sleepLength", { ns: "ui" })).toBe("Sleep Length");
    expect(
      i18n.t("estate.sleepLengthDescription", { ns: "ui", hours: 12 }),
    ).toBe("Max. 12 hours of continuous sleep");
    expect(
      i18n.t("estate.sleepIntensityDescription", { ns: "ui", percent: 35 }),
    ).toBe("Receive 35% of village production while sleeping");
    expect(tWithFallback("ui", "estate.improve", "Improve")).toBe("Improve");
  });

  it("resolves insight reveal badge tooltip in German", async () => {
    await i18n.changeLanguage("de");
    expect(
      i18n.exists("badges.insightRevealSeeEffects", { ns: "ui" }),
    ).toBe(true);
    expect(i18n.getResource("de", "ui", "badges.insightRevealSeeEffects")).toBe(
      "Effekte für {{cost}} {{resource}} anzeigen",
    );
    const opts = { cost: 50, resource: "Einsicht" };
    const viaBadgeKey = i18n.t("ui:badges.insightRevealSeeEffects", opts);
    expect(viaBadgeKey).toBe("Effekte für 50 Einsicht anzeigen");
    expect(viaBadgeKey).not.toContain("See effects");
  });

  it("resolves timed event prolong tooltip in ui namespace", () => {
    const opts = { minutes: 5, cost: 250, resource: "Insight" };
    expect(i18n.exists("timedEvent.prolongForInsight", { ns: "ui" })).toBe(true);
    expect(i18n.t("ui:timedEvent.prolongForInsight", opts)).toBe(
      "Extend time by 5 min for 250 Insight",
    );
    expect(
      tWithFallback(
        "ui",
        "timedEvent.prolongForInsight",
        "Extend time by {{minutes}} min for {{cost}} {{resource}}",
        opts,
      ),
    ).toBe("Extend time by 5 min for 250 Insight");
  });

  it("tWithFallback returns English default when ui key is missing", async () => {
    await i18n.changeLanguage("de");
    expect(
      tWithFallback(
        "ui",
        "timedEvent.thisKeyDoesNotExist",
        "Extend time by {{minutes}} min for {{cost}} {{resource}}",
        { minutes: 5, cost: 250, resource: "Einsicht" },
      ),
    ).toBe("Extend time by 5 min for 250 Einsicht");
  });

  it("resolves timed event prolong tooltip in German", async () => {
    await i18n.changeLanguage("de");
    const opts = { minutes: 5, cost: 250, resource: "Einsicht" };
    expect(
      tWithFallback(
        "ui",
        "timedEvent.prolongForInsight",
        "Extend time by {{minutes}} min for {{cost}} {{resource}}",
        opts,
      ),
    ).toBe("Zeit um 5 Min. für 250 Einsicht verlängern");
    expect(
      tWithFallback(
        "ui",
        "timedEvent.prolongForInsight",
        "Extend time by {{minutes}} min for {{cost}} {{resource}}",
        opts,
      ),
    ).not.toContain("Extend time by");
  });

  it("resolves prolong tooltip via reactive t() with ui: prefix in German", async () => {
    await i18n.changeLanguage("de");
    const opts = {
      defaultValue: "Extend time by {{minutes}} min for {{cost}} {{resource}}",
      minutes: 5,
      cost: 250,
      resource: "Einsicht",
    };
    const result = i18n.t("ui:timedEvent.prolongForInsight", opts);
    expect(result).toBe("Zeit um 5 Min. für 250 Einsicht verlängern");
    expect(result).not.toContain("Extend time by");
  });

  it("tWithFallback uses German catalog when language tag is de-DE", async () => {
    await i18n.changeLanguage("de-DE");
    const opts = { minutes: 5, cost: 250, resource: "Einsicht" };
    expect(
      i18n.exists("timedEvent.prolongForInsight", { ns: "ui", lng: "de" }),
    ).toBe(true);
    expect(
      tWithFallback(
        "ui",
        "timedEvent.prolongForInsight",
        "Extend time by {{minutes}} min for {{cost}} {{resource}}",
        opts,
      ),
    ).toBe("Zeit um 5 Min. für 250 Einsicht verlängern");
  });

  it("resolves villagerCost plural tooltip in English and German", async () => {
    expect(getUiTooltip("villagerCost", "-{{count}} Villager", { count: 1 })).toBe(
      "-1 Villager",
    );
    expect(getUiTooltip("villagerCost", "-{{count}} Villagers", { count: 3 })).toBe(
      "-3 Villagers",
    );
    await i18n.changeLanguage("de");
    expect(getUiTooltip("villagerCost", "-{{count}} Villager", { count: 1 })).toBe(
      "-1 Dorfbewohner",
    );
  });

  it("getActionCostBreakdown humans sacrifice shows translated villager cost", async () => {
    await i18n.changeLanguage("en");
    const state = gameStateSchema.parse({
      flags: { humanSacrificeUnlocked: true },
      buildings: { blackMonolith: 1 },
      story: { seen: { humansSacrificeLevel: 0 } },
      villagers: { free: 10, total: 10 },
    });
    const breakdown = getActionCostBreakdown("humans", state);
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].text).toBe("-1 Villager");
    expect(breakdown[0].text).not.toContain("tooltips.");
  });

  it("falls back to inline English for missing keys", () => {
    expect(getActionLabel("unknownAction", "Fallback Label")).toBe(
      "Fallback Label",
    );
  });

  it("translates known action labels in German", async () => {
    await i18n.changeLanguage("de");
    const label = getActionLabel(
      "buildWoodenHut",
      "Wooden Hut",
    );
    expect(label).not.toBe("Wooden Hut");
  });

  it("resolves first attack wave combat intro text", async () => {
    await i18n.changeLanguage("de");
    const state = gameStateSchema.parse({});
    expect(resolveEventTitle("firstWave", state)).toContain("Welle");
    const msg = resolveEventMessage("firstWave", undefined, state);
    expect(msg.length).toBeGreaterThan(20);
    expect(msg).toContain("Höhle");
  });

  it("resolves blood moon message from message.default catalog key", async () => {
    await i18n.changeLanguage("de");
    const state = gameStateSchema.parse({});
    const msg = resolveEventMessage("bloodMoonAttack", undefined, state, {
      sacrificeAmount: 5,
    });
    expect(msg.length).toBeGreaterThan(20);
    expect(msg).toContain("Lykanthropen");
  });

  it("translates event messages when catalog key exists", async () => {
    await i18n.changeLanguage("de");
    const msg = getEventMessage(
      "paleFigure",
      "At dawn, villagers glimpse a tall, pale, slender figure at the woods' edge. What do you do?",
    );
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("translates relic names via clothing catalog in German", async () => {
    await i18n.changeLanguage("de");
    expect(getEffectName("clothing", "wooden_figure", "Wooden Figure")).toBe(
      "Holzfigur",
    );
    expect(getEffectName("relics", "wooden_figure", "Wooden Figure")).toBe(
      "Wooden Figure",
    );
  });

  it("resolves solsticeGathering title and message from catalog", async () => {
    const state = gameStateSchema.parse({});
    expect(resolveEventTitle("solsticeGathering", undefined, state)).toBe(
      "Solstice Gathering",
    );
    const msg = resolveEventMessage("solsticeGathering", undefined, state);
    expect(msg).toContain("longest night");

    await i18n.changeLanguage("de");
    expect(resolveEventTitle("solsticeGathering", undefined, state)).toBe(
      "Sonnenwend-Fest",
    );
    const deMsg = resolveEventMessage("solsticeGathering", undefined, state);
    expect(deMsg).toContain("längste Nacht");
  });
});
