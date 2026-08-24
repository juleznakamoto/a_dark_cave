import { describe, it, expect } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { generateMerchantChoices } from "./eventsMerchant";

const UNSEEN_EARLY_STOCK = ["leather", "steel", "torch", "blacksteel"] as const;

function earlyMerchantState(resources: Record<string, number>) {
  return gameStateSchema.parse({
    buildings: { woodenHut: 5, stoneHut: 0, tradePost: 1 },
    resources,
    story: { seen: {} },
  });
}

function collectChoices(state: ReturnType<typeof earlyMerchantState>, rolls = 80) {
  return Array.from({ length: rolls }, () => generateMerchantChoices(state));
}

describe("merchant seen-resource stock", () => {
  it("does not sell resources the player has never had", () => {
    const state = earlyMerchantState({
      food: 500,
      wood: 500,
      stone: 500,
      gold: 100,
    });

    for (const choices of collectChoices(state)) {
      for (const choice of choices) {
        if (choice.buyResource && !choice.buyItem) {
          expect(UNSEEN_EARLY_STOCK).not.toContain(choice.buyResource);
        }
      }
    }
  });

  it("can sell a resource after the player has seen it", () => {
    const state = earlyMerchantState({
      food: 500,
      wood: 500,
      stone: 500,
      leather: 1,
      gold: 100,
    });

    const sawLeather = collectChoices(state).some((choices) =>
      choices.some((c) => c.buyResource === "leather"),
    );
    expect(sawLeather).toBe(true);
  });

  it("still sells a resource after it has been spent", () => {
    const state = gameStateSchema.parse({
      buildings: { woodenHut: 5, stoneHut: 0, tradePost: 1 },
      resources: { food: 500, wood: 500, stone: 500, leather: 0, gold: 100 },
      seenResources: ["leather"],
      story: { seen: {} },
    });

    const sawLeather = collectChoices(state).some((choices) =>
      choices.some((c) => c.buyResource === "leather"),
    );
    expect(sawLeather).toBe(true);
  });

  it("does not pay the player in unseen resources", () => {
    const state = earlyMerchantState({
      food: 500,
      wood: 500,
      stone: 500,
      fur: 200,
      gold: 100,
    });

    for (const choices of collectChoices(state)) {
      for (const choice of choices) {
        if (choice.id.startsWith("sell_") && choice.buyResource) {
          expect(UNSEEN_EARLY_STOCK).not.toContain(choice.buyResource);
        }
      }
    }
  });

  it("does not offer to buy resources the player has never seen", () => {
    const state = earlyMerchantState({
      food: 500,
      wood: 500,
      stone: 500,
      gold: 100,
    });

    for (const choices of collectChoices(state)) {
      expect(choices.some((c) => c.sellResource === "iron")).toBe(false);
      expect(choices.some((c) => c.sellResource === "fur")).toBe(false);
      expect(choices.some((c) => c.id.startsWith("sell_iron"))).toBe(false);
    }
  });

  it("does not price post-last-wave totems in unseen steel or blacksteel", () => {
    const state = gameStateSchema.parse({
      buildings: { woodenHut: 12, stoneHut: 8, tradePost: 1 },
      resources: { food: 500, wood: 500, stone: 500, gold: 100 },
      story: { seen: { secondBossWaveVictory: true } },
    });

    const totemIds = new Set([
      "buy_bone_totem_500_post_wave",
      "buy_leather_totem_500_post_wave",
    ]);
    for (const choices of collectChoices(state)) {
      expect(choices.some((c) => totemIds.has(c.id))).toBe(false);
    }
  });

  it("can price post-last-wave totems in steel after the player has seen it", () => {
    const state = gameStateSchema.parse({
      buildings: { woodenHut: 12, stoneHut: 8, tradePost: 1 },
      resources: { food: 500, wood: 500, stone: 500, steel: 200, gold: 100 },
      story: { seen: { secondBossWaveVictory: true } },
    });

    const totemIds = new Set([
      "buy_bone_totem_500_post_wave",
      "buy_leather_totem_500_post_wave",
    ]);
    const sawSteelPayment = collectChoices(state).some((choices) =>
      choices.some((c) => totemIds.has(c.id) && c.sellResource === "steel"),
    );
    const sawBlacksteelPayment = collectChoices(state).some((choices) =>
      choices.some((c) => totemIds.has(c.id) && c.sellResource === "blacksteel"),
    );
    expect(sawSteelPayment).toBe(true);
    expect(sawBlacksteelPayment).toBe(false);
  });
});
