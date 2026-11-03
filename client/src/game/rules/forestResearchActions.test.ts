import { afterEach, describe, it, expect, vi } from "vitest";
import { gameStateSchema } from "@shared/schema";
import {
  CHAINMASTER_BOOK_OFFER_CHANCES,
  FINANCE_EXPEDITION_TIERS,
  getChainmasterBookOfferChance,
  getFinanceExpeditionTierIndex,
  handleFinanceExpedition,
  isFinanceExpeditionPriorUnlocked,
} from "./forestResearchActions";
import { isPriorActionEligible } from "@/game/buttonUpgrades";
import type { ActionResult } from "@/game/actions";

function baseState(usageCount: number) {
  return gameStateSchema.parse({
    resources: { insight: 0, gold: 100, food: 2000 },
    story: {
      seen: {
        scholarResearchExpeditionsUnlocked: true,
        financeExpeditionUsageCount: usageCount,
      },
    },
  });
}

describe("finance expedition tiers", () => {
  it("asks for 2, 4, 6, 8, then 10 villagers", () => {
    expect(FINANCE_EXPEDITION_TIERS.map((tier) => tier.villagers)).toEqual([
      2, 4, 6, 8, 10,
    ]);
  });
});

describe("getChainmasterBookOfferChance", () => {
  it("is 0, 10%, 25%, 50%, then certain, including later runs", () => {
    expect(CHAINMASTER_BOOK_OFFER_CHANCES).toEqual([0, 0.1, 0.25, 0.5, 1]);
    expect([0, 1, 2, 3, 4, 5, 9].map(getChainmasterBookOfferChance)).toEqual([
      0, 0.1, 0.25, 0.5, 1, 1, 1,
    ]);
  });
});

describe("handleFinanceExpedition", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function run(usageCount: number, roll: number) {
    vi.spyOn(Math, "random").mockReturnValue(roll);
    const result: ActionResult = {
      stateUpdates: {},
      logEntries: [],
      delayedEffects: [],
    };
    handleFinanceExpedition(baseState(usageCount), result);
    return result.logEntries!.some((e) => e.eventId === "leatherboundBookFound");
  }

  it("offers the leatherbound book when the fifth expedition returns", () => {
    const maxTierIndex = FINANCE_EXPEDITION_TIERS.length - 1;
    const state = baseState(maxTierIndex);
    expect(getFinanceExpeditionTierIndex(state)).toBe(maxTierIndex);

    const result: ActionResult = {
      stateUpdates: {},
      logEntries: [],
      delayedEffects: [],
    };

    handleFinanceExpedition(state, result);

    const dialogEntry = result.logEntries!.find(
      (e) => e.eventId === "leatherboundBookFound",
    );
    expect(dialogEntry).toBeDefined();
    expect(dialogEntry?.skipEventLog).toBe(true);
    expect(dialogEntry?.choices?.length).toBe(1);
  });

  it("does not offer book again after already found", () => {
    const state = baseState(FINANCE_EXPEDITION_TIERS.length - 1);
    state.story.seen.leatherboundBookFound = true;

    const result: ActionResult = {
      stateUpdates: {},
      logEntries: [],
      delayedEffects: [],
    };

    handleFinanceExpedition(state, result);

    expect(
      result.logEntries!.some((e) => e.eventId === "leatherboundBookFound"),
    ).toBe(false);
  });

  it("rolls the book offer from the second expedition, and never on the first", () => {
    expect(run(0, 0)).toBe(false);
    expect(run(1, 0.09)).toBe(true);
    expect(run(1, 0.1)).toBe(false);
    expect(run(2, 0.24)).toBe(true);
    expect(run(2, 0.25)).toBe(false);
    expect(run(3, 0.49)).toBe(true);
    expect(run(3, 0.5)).toBe(false);
    expect(run(4, 0.99)).toBe(true);
    expect(run(8, 0.99)).toBe(true);
  });
});

describe("isFinanceExpeditionPriorUnlocked", () => {
  it("is locked until the max tier has been completed once", () => {
    expect(isFinanceExpeditionPriorUnlocked(baseState(0))).toBe(false);
    expect(
      isFinanceExpeditionPriorUnlocked(
        baseState(FINANCE_EXPEDITION_TIERS.length - 1),
      ),
    ).toBe(false);
    expect(
      isFinanceExpeditionPriorUnlocked(
        baseState(FINANCE_EXPEDITION_TIERS.length),
      ),
    ).toBe(true);
    expect(
      isFinanceExpeditionPriorUnlocked(
        baseState(FINANCE_EXPEDITION_TIERS.length + 3),
      ),
    ).toBe(true);
  });

  it("gates Prior eligibility for financeExpedition only", () => {
    const locked = baseState(FINANCE_EXPEDITION_TIERS.length - 1);
    const unlocked = baseState(FINANCE_EXPEDITION_TIERS.length);
    expect(isPriorActionEligible("financeExpedition", locked)).toBe(false);
    expect(isPriorActionEligible("financeExpedition", unlocked)).toBe(true);
    expect(isPriorActionEligible("chopWood", locked)).toBe(true);
  });
});
