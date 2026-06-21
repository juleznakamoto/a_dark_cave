import { describe, it, expect } from "vitest";
import { gameStateSchema } from "@shared/schema";
import {
  FINANCE_EXPEDITION_TIERS,
  getFinanceExpeditionTierIndex,
  handleFinanceExpedition,
} from "./forestResearchActions";
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

describe("handleFinanceExpedition", () => {
  it("offers leatherbound book dialog on first max-tier completion only", () => {
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

  it("does not offer book before max tier", () => {
    const state = baseState(0);
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
});
