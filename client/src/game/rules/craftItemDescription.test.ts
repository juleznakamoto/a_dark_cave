import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import i18n from "@/i18n/index";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import {
  craftActionIdToItemKey,
  getCraftItemDescription,
} from "./craftItemDescription";

describe("craftItemDescription", () => {
  beforeAll(async () => {
    await ensureGameplayLocalesLoaded();
  });

  beforeEach(async () => {
    await i18n.changeLanguage("de");
  });

  it("maps craft action ids to effect item keys", () => {
    expect(craftActionIdToItemKey("craftBlacksteelPickaxe")).toBe(
      "blacksteel_pickaxe",
    );
    expect(craftActionIdToItemKey("craftBlacksteelSword")).toBe(
      "blacksteel_sword",
    );
  });

  it("returns localized craft item descriptions", () => {
    const description = getCraftItemDescription("craftBlacksteelPickaxe");
    expect(description).toBe("Spitzhacke aus seltenem Schwarzstahl");
  });
});
