import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import { getFellowshipDisplayName } from "./combatLabels";

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
