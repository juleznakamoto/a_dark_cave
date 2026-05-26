import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import { getActionLabel, getEventMessage } from "./resolveGameText";
import { resolveEventMessage, resolveEventTitle } from "./eventText";
import { gameStateSchema } from "@shared/schema";

describe("i18n runtime", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("loads English UI strings", () => {
    expect(i18n.t("profile.save", { ns: "ui" })).toBe("Save");
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
