import { describe, it, expect } from "vitest";
import { gameStateSchema } from "@shared/schema";
import {
  chainmasterEvents,
  getChainmasterCollectorVisitCount,
  getChainmasterTeachCost,
  CHAINMASTER_COLLECTOR_MAX_VISITS,
  CHAINMASTER_SELL_GOLD,
} from "./eventsChainmaster";

function baseState(overrides: Record<string, unknown> = {}) {
  return gameStateSchema.parse({
    relics: { leatherbound_book: true },
    resources: { gold: 1000 },
    stats: { madnessFromEvents: 0 },
    story: { seen: {} },
    ...overrides,
  });
}

describe("chainmasterEvents", () => {
  describe("leatherboundBookFound", () => {
    it("keepBook grants relic and marks story flag", () => {
      const choice = chainmasterEvents.leatherboundBookFound.choices![0];
      const result = choice.effect(baseState({ relics: {} }));

      expect(result.relics?.leatherbound_book).toBe(true);
      expect(result.story?.seen?.leatherboundBookFound).toBe(true);
    });
  });

  describe("chainmasterCollector", () => {
    it("condition requires relic and unresolved visits", () => {
      const event = chainmasterEvents.chainmasterCollector;
      expect(event.condition(baseState())).toBe(true);
      expect(
        event.condition(
          baseState({
            story: { seen: { chainmasterCollectorResolved: true } },
          }),
        ),
      ).toBe(false);
      expect(
        event.condition(
          baseState({
            story: {
              seen: {
                chainmasterCollectorVisitCount: CHAINMASTER_COLLECTOR_MAX_VISITS,
              },
            },
          }),
        ),
      ).toBe(false);
    });

    it("escalates teach cost by visit count", () => {
      expect(getChainmasterTeachCost(baseState())).toBe(250);
      expect(
        getChainmasterTeachCost(
          baseState({
            story: { seen: { chainmasterCollectorVisitCount: 2 } },
          }),
        ),
      ).toBe(750);
    });

    it("sellBook grants gold and resolves", () => {
      const choice = chainmasterEvents.chainmasterCollector.choices!.find(
        (c) => c.id === "sellBook",
      )!;
      const result = choice.effect(baseState());

      expect(result.resources?.gold).toBe(1000 + CHAINMASTER_SELL_GOLD);
      expect(result.relics?.leatherbound_book).toBe(false);
      expect(result.story?.seen?.chainmasterCollectorResolved).toBe(true);
      expect(result._logMessageKey).toBe("sellOutcome");
    });

    it("learnSecrets deducts teach cost and unlocks book skill", () => {
      const choice = chainmasterEvents.chainmasterCollector.choices!.find(
        (c) => c.id === "learnSecrets",
      )!;
      const result = choice.effect(baseState());

      expect(result.resources?.gold).toBe(750);
      expect(result.relics?.leatherbound_book).toBe(false);
      expect(result.books?.book_of_chainmaster).toBe(true);
      expect(result.chainmasterSkills?.level).toBe(0);
      expect(result.stats?.madnessFromEvents).toBe(2);
      expect(result.story?.seen?.chainmasterCollectorResolved).toBe(true);
      expect(result._logMessageKey).toBe("learnOutcome");
    });

    it("fallback increments visit count", () => {
      const fallback = chainmasterEvents.chainmasterCollector.fallbackChoice!;
      const result = fallback.effect(baseState());

      expect(getChainmasterCollectorVisitCount(result as never)).toBe(1);
      expect(result._logMessageKey).toBe("fallback");
    });

    it("final fallback uses fallbackLast log key", () => {
      const fallback = chainmasterEvents.chainmasterCollector.fallbackChoice!;
      const result = fallback.effect(
        baseState({
          story: {
            seen: {
              chainmasterCollectorVisitCount:
                CHAINMASTER_COLLECTOR_MAX_VISITS - 1,
            },
          },
        }),
      );

      expect(result._logMessageKey).toBe("fallbackLast");
      expect(getChainmasterCollectorVisitCount(result as never)).toBe(
        CHAINMASTER_COLLECTOR_MAX_VISITS,
      );
    });
  });
});
