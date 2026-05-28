import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import {
  getDamagedBuildingDisplayName,
  getFellowshipDisplayName,
} from "./combatLabels";

describe("getFellowshipDisplayName", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("resolves restless_knight from effects catalog in English", () => {
    expect(getFellowshipDisplayName("restless_knight")).toBe("Restless Knight");
  });

  it("resolves elder_wizard from effects catalog in English", () => {
    expect(getFellowshipDisplayName("elder_wizard")).toBe("Elder Wizard");
  });

  it("resolves restless_knight from effects catalog in German", async () => {
    await i18n.changeLanguage("de");
    expect(getFellowshipDisplayName("restless_knight")).toBe("Rastloser Ritter");
  });

  it("falls back to fellowshipEffects name for unknown ids", () => {
    expect(getFellowshipDisplayName("unknown_fellow")).toBe("Unknown Fellow");
  });
});

describe("getDamagedBuildingDisplayName", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("resolves watchtower by id in English", () => {
    expect(getDamagedBuildingDisplayName("watchtower/1")).toBe("Watchtower");
  });

  it("resolves legacy English watchtower label in Spanish", async () => {
    await i18n.changeLanguage("es");
    expect(getDamagedBuildingDisplayName("Watchtower")).toBe(
      "Torre de vigilancia",
    );
  });

  it("resolves watchtower tier by id in Spanish", async () => {
    await i18n.changeLanguage("es");
    expect(getDamagedBuildingDisplayName("watchtower/1")).toBe(
      "Torre de vigilancia",
    );
  });

  it("resolves bastion by id in Spanish", async () => {
    await i18n.changeLanguage("es");
    expect(getDamagedBuildingDisplayName("bastion")).toBe("Bastión");
  });
});
