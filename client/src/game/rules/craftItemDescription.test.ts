import { describe, it, expect, beforeEach } from "vitest";
import i18n from "@/i18n/index";
import {
  craftActionIdToItemKey,
  getCraftItemDescription,
} from "./craftItemDescription";

describe("craftItemDescription", () => {
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
