import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "@/game/state";
import type { GameState } from "@shared/schema";
import {
  createJugglerGreatFeastActivation,
  createShopGreatFeastActivation,
  GREAT_FEAST_DURATION_MS,
  GREAT_FEAST_PRODUCTION_MULTIPLIER,
  GREAT_FEAST_STRANGER_APPROACH_BONUS,
  JUGGLER_GREAT_FEAST_DURATION_MS,
  JUGGLER_GREAT_FEAST_PRODUCTION_MULTIPLIER,
  JUGGLER_GREAT_FEAST_STRANGER_APPROACH_BONUS,
} from "@shared/shopItems";
import { getEventCatalogId } from "@/i18n/eventText";
import { getStrangerApproachProbability } from "./effectsCalculation";
import { getTotalPopulationEffects } from "@/game/population";
import { feastEvents } from "./eventsFeast";

vi.mock("@/lib/edition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/edition")>();
  return {
    ...actual,
    isSteamDesktopEditionActive: vi.fn(() => false),
  };
});

import { isSteamDesktopEditionActive } from "@/lib/edition";

function state(overrides: Partial<GameState> = {}): GameState {
  const initial = createInitialState() as GameState;
  return {
    ...initial,
    flags: { ...initial.flags, forestUnlocked: true, villageUnlocked: true },
    buildings: { ...initial.buildings, woodenHut: 8 },
    villagers: { ...initial.villagers, gatherer: 2, hunter: 1, free: 0 },
    feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 3 },
    greatFeastState: {
      isActive: false,
      endTime: 0,
      durationMs: GREAT_FEAST_DURATION_MS,
      productionMultiplier: GREAT_FEAST_PRODUCTION_MULTIPLIER,
      strangerApproachBonus: GREAT_FEAST_STRANGER_APPROACH_BONUS,
    },
    ...overrides,
  };
}

function acceptChoice(eventId: "feast4" | "feast8", game: GameState) {
  const def = feastEvents[eventId];
  const choices =
    typeof def.choices === "function" ? def.choices(game) : def.choices;
  return choices![0]!.effect!(game);
}

describe("feast edition split (detailed)", () => {
  beforeEach(() => {
    vi.mocked(isSteamDesktopEditionActive).mockReturnValue(false);
  });

  describe("web", () => {
    it("feast4 and feast8 are normal Village Feasts (food only)", () => {
      expect(getEventCatalogId(feastEvents.feast4)).toBe("feast");
      expect(getEventCatalogId(feastEvents.feast8)).toBe("feast");

      const game = state({
        resources: { ...createInitialState().resources, food: 5000, gold: 999 },
      });
      const result = acceptChoice("feast4", game);

      expect(result.resources?.food).toBe(4000);
      expect(result.resources?.gold).toBe(999);
      expect(result.feastState?.isActive).toBe(true);
      expect(result.feastState?.lastAcceptedLevel).toBe(4);
      expect(result.greatFeastState).toBeUndefined();
    });

    it("feast8 web costs 10'000 food and no gold", () => {
      const game = state({
        resources: {
          ...createInitialState().resources,
          food: 20_000,
          gold: 5_000,
        },
        feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 7 },
        story: {
          ...createInitialState().story,
          seen: {
            ...createInitialState().story.seen,
            secondWaveVictory: true,
          },
        },
      });
      const result = acceptChoice("feast8", game);
      expect(result.resources?.food).toBe(10_000);
      expect(result.resources?.gold).toBe(5_000);
      expect(result.feastState?.isActive).toBe(true);
      expect(result.greatFeastState).toBeUndefined();
    });
  });

  describe("Steam desktop", () => {
    beforeEach(() => {
      vi.mocked(isSteamDesktopEditionActive).mockReturnValue(true);
    });

    it("feast4 is juggler Great Feast with nerfed stats", () => {
      expect(getEventCatalogId(feastEvents.feast4)).toBe("jugglerGreatFeast");
      const game = state({
        resources: {
          ...createInitialState().resources,
          food: 5000,
          gold: 250,
        },
      });
      const before = Date.now();
      const result = acceptChoice("feast4", game);

      expect(result.resources?.food).toBe(4000);
      expect(result.resources?.gold).toBe(150);
      expect(result.feastState?.isActive).toBe(false);
      expect(result.feastState?.lastAcceptedLevel).toBe(4);
      expect(result.greatFeastState).toMatchObject({
        isActive: true,
        durationMs: JUGGLER_GREAT_FEAST_DURATION_MS,
        productionMultiplier: JUGGLER_GREAT_FEAST_PRODUCTION_MULTIPLIER,
        strangerApproachBonus: JUGGLER_GREAT_FEAST_STRANGER_APPROACH_BONUS,
      });
      expect(result.greatFeastState!.endTime).toBeGreaterThanOrEqual(
        before + JUGGLER_GREAT_FEAST_DURATION_MS,
      );
      expect(result.greatFeastState!.endTime).toBeLessThan(
        before + GREAT_FEAST_DURATION_MS,
      );
    });

    it("feast8 return visit costs food+gold and advances ladder", () => {
      const game = state({
        resources: {
          ...createInitialState().resources,
          food: 20_000,
          gold: 2_000,
        },
        feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 7 },
        story: {
          ...createInitialState().story,
          seen: {
            ...createInitialState().story.seen,
            secondWaveVictory: true,
          },
        },
      });
      expect(feastEvents.feast8.message?.(game)).toBe("return");
      const result = acceptChoice("feast8", game);
      expect(result.resources?.food).toBe(10_000);
      expect(result.resources?.gold).toBe(1_000);
      expect(result.feastState?.lastAcceptedLevel).toBe(8);
      expect(result.greatFeastState?.productionMultiplier).toBe(3);
      expect(result.greatFeastState?.strangerApproachBonus).toBe(0.15);
    });
  });

  describe("shop vs juggler power", () => {
    it("shop activation stays at 30 min / 5x / +25%", () => {
      const shop = createShopGreatFeastActivation(1_000_000);
      expect(shop).toMatchObject({
        isActive: true,
        endTime: 1_000_000 + GREAT_FEAST_DURATION_MS,
        durationMs: GREAT_FEAST_DURATION_MS,
        productionMultiplier: 5,
        strangerApproachBonus: 0.25,
      });
    });

    it("juggler activation is 15 min / 3x / +15%", () => {
      const juggler = createJugglerGreatFeastActivation(1_000_000);
      expect(juggler).toMatchObject({
        isActive: true,
        endTime: 1_000_000 + JUGGLER_GREAT_FEAST_DURATION_MS,
        durationMs: JUGGLER_GREAT_FEAST_DURATION_MS,
        productionMultiplier: 3,
        strangerApproachBonus: 0.15,
      });
    });

    it("production and stranger chance follow stored greatFeastState fields", () => {
      const hunterJobs = ["hunter"] as const;
      const base = state({
        feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 4 },
        villagers: {
          ...createInitialState().villagers,
          hunter: 2,
          gatherer: 0,
          free: 0,
        },
        buildings: { ...createInitialState().buildings, cabin: 1, woodenHut: 8 },
      });
      const baseEffects = getTotalPopulationEffects(base, [...hunterJobs]);

      const shopState = {
        ...base,
        greatFeastState: createShopGreatFeastActivation(),
      };
      const shopEffects = getTotalPopulationEffects(shopState, [...hunterJobs]);

      const jugglerState = {
        ...base,
        greatFeastState: createJugglerGreatFeastActivation(),
      };
      const jugglerEffects = getTotalPopulationEffects(jugglerState, [
        ...hunterJobs,
      ]);

      // Fur has no upkeep, so multipliers apply cleanly (2 hunters × 1 fur).
      expect(baseEffects.fur).toBe(2);
      expect(shopEffects.fur).toBe(10);
      expect(jugglerEffects.fur).toBe(6);
      expect(shopEffects.bones).toBe(baseEffects.bones! * 5);
      expect(jugglerEffects.bones).toBe(baseEffects.bones! * 3);

      expect(getStrangerApproachProbability(shopState).fromGreatFeast).toBe(
        0.25,
      );
      expect(getStrangerApproachProbability(jugglerState).fromGreatFeast).toBe(
        0.15,
      );
    });
  });
});
