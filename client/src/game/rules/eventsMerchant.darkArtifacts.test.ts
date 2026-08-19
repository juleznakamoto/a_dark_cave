import { describe, it, expect } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { isMerchantTradeCurrentlyAvailable } from "./eventsMerchant";

function artifactMerchantState(overrides?: {
  BTP?: number;
  woodenHut?: number;
  stoneHut?: number;
  skullLantern?: boolean;
  tarnishedCompass?: boolean;
  crowHarness?: boolean;
}) {
  return gameStateSchema.parse({
    BTP: overrides?.BTP ?? 0,
    buildings: {
      woodenHut: overrides?.woodenHut ?? 10,
      stoneHut: overrides?.stoneHut ?? 5,
    },
    tools: {
      skull_lantern: overrides?.skullLantern ?? false,
      crow_harness: overrides?.crowHarness ?? false,
    },
    relics: {
      tarnished_compass: overrides?.tarnishedCompass ?? false,
    },
    story: { seen: {} },
  });
}

describe("merchant dark artifacts (web + Steam)", () => {
  it("offers artifacts on web (BTP 0) once hut gates are met", () => {
    const state = artifactMerchantState({ BTP: 0 });
    expect(isMerchantTradeCurrentlyAvailable("trade_skull_lantern", state)).toBe(
      true,
    );
    expect(
      isMerchantTradeCurrentlyAvailable("trade_tarnished_compass", state),
    ).toBe(true);
    expect(isMerchantTradeCurrentlyAvailable("trade_crow_harness", state)).toBe(
      true,
    );
  });

  it("still offers artifacts in Steam BTP mode", () => {
    const state = artifactMerchantState({ BTP: 1 });
    expect(isMerchantTradeCurrentlyAvailable("trade_skull_lantern", state)).toBe(
      true,
    );
    expect(
      isMerchantTradeCurrentlyAvailable("trade_tarnished_compass", state),
    ).toBe(true);
    expect(isMerchantTradeCurrentlyAvailable("trade_crow_harness", state)).toBe(
      true,
    );
  });

  it("hides an artifact the player already owns (including real-money purchases)", () => {
    const state = artifactMerchantState({
      skullLantern: true,
      tarnishedCompass: true,
      crowHarness: true,
    });
    expect(isMerchantTradeCurrentlyAvailable("trade_skull_lantern", state)).toBe(
      false,
    );
    expect(
      isMerchantTradeCurrentlyAvailable("trade_tarnished_compass", state),
    ).toBe(false);
    expect(isMerchantTradeCurrentlyAvailable("trade_crow_harness", state)).toBe(
      false,
    );
  });

  it("respects hut progression gates", () => {
    const early = artifactMerchantState({ woodenHut: 9, stoneHut: 1 });
    expect(isMerchantTradeCurrentlyAvailable("trade_skull_lantern", early)).toBe(
      false,
    );
    expect(
      isMerchantTradeCurrentlyAvailable("trade_tarnished_compass", early),
    ).toBe(false);
    expect(isMerchantTradeCurrentlyAvailable("trade_crow_harness", early)).toBe(
      false,
    );
  });
});
