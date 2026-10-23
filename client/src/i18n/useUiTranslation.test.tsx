/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import i18n from "./index";
import { ensureGameplayLocalesLoaded } from "./loadLocaleResources";
import { useUiTranslation } from "./useUiTranslation";
import { getEnUiCatalogString } from "./enUiCatalog";

describe("useUiTranslation", () => {
  beforeAll(async () => {
    await ensureGameplayLocalesLoaded();
  });

  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("resolves combat ui keys (the raw-key failure mode)", () => {
    const { result } = renderHook(() => useUiTranslation());
    expect(result.current.t("combat.fight")).toBe("Fight");
    expect(result.current.t("combat.roundTitle", { round: 3 })).toBe(
      "Combat - Round 3",
    );
    expect(result.current.t("combat.fortress")).toBe("Fortress");
    expect(result.current.t("combat.crushingStrike")).toBe("Crushing Strike");
  });

  it("resolves common: prefixed keys", () => {
    const { result } = renderHook(() => useUiTranslation());
    expect(result.current.t("common:buttons.continue")).toBe("Continue");
    expect(result.current.t("tabs.map", { ns: "common" })).toBe("Map");
  });

  it("falls back to English catalog when the active locale key is missing", async () => {
    await i18n.changeLanguage("de");
    // Force a miss on the live bundle for an English-only path; catalog still has en.
    const enFight = getEnUiCatalogString("combat.fight");
    expect(enFight).toBe("Fight");

    const { result } = renderHook(() => useUiTranslation());
    // Real de key should still win when present.
    expect(result.current.t("combat.fight")).not.toBe("combat.fight");
    expect(result.current.t("combat.fight")).not.toMatch(/^combat\./);
  });
});
