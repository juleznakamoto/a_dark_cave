import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/featureFlags", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/featureFlags")>();
  return { ...actual, PACTS_ENABLED: true };
});

import { gameStateSchema, type GameState } from "@shared/schema";
import { executeGameAction } from "@/game/actions";
import "@/game/rules";
import { canExecuteAction, shouldShowAction } from "./index";
import { gameEvents } from "./events";
import {
  bombDisplayedBaseDamage,
  bombKnowledgeDamageBonus,
  SUPERIOR_BOMBS_BASE_DAMAGE,
} from "./skillUpgrades";
import { villageBuildActions } from "./villageBuildActions";

function stateOf(partial: Record<string, unknown> = {}): GameState {
  return gameStateSchema.parse(partial);
}

describe("alchemist hall blast", () => {
  const event = gameEvents.alchemistExperimentsCrossedALine;

  it("is a one-shot story event, not a timed tab", () => {
    expect(event.timeProbability).toBe(30);
    expect(event.earliestMinutes).toBe(15);
    expect(event.repeatable).toBe(false);
    expect(event.showAsTimedTab).toBeUndefined();
  });

  it("fires only after the Blazesmith pact and the alchemist have arrived", () => {
    const ready = stateOf({
      buildings: { alchemistHall: 1 },
      chosenPacts: ["blazesmith"],
      story: { seen: { alchemistArrives: true } },
    });
    expect(event.condition!(ready)).toBe(true);
    expect(
      event.condition!(
        stateOf({
          buildings: { alchemistHall: 1 },
          story: { seen: { alchemistArrives: true } },
        }),
      ),
    ).toBe(false);
    expect(
      event.condition!(
        stateOf({
          buildings: { alchemistHall: 1 },
          chosenPacts: ["blazesmith"],
        }),
      ),
    ).toBe(false);
  });

  it("grants Superior Bombs and marks the hall destroyed", () => {
    const ready = stateOf({
      buildings: { alchemistHall: 1 },
      chosenPacts: ["blazesmith"],
      blessings: { ebon_grace: true },
      story: { seen: { alchemistArrives: true } },
    });
    const effect = event.choices![0].effect(ready);
    expect(effect.blessings?.superior_bombs).toBe(true);
    expect(effect.blessings?.ebon_grace).toBe(true);
    expect(effect.story?.seen.alchemistHallDestroyed).toBe(true);
    expect(event.condition!(stateOf({
      buildings: { alchemistHall: 1 },
      chosenPacts: ["blazesmith"],
      blessings: { superior_bombs: true },
      story: { seen: { alchemistArrives: true, alchemistHallDestroyed: true } },
    }))).toBe(false);
  });

  it("adds 20 base damage and 1 more damage per 5 knowledge", () => {
    const blessed = { blessings: { superior_bombs: true } };
    expect(SUPERIOR_BOMBS_BASE_DAMAGE).toBe(20);
    expect(bombDisplayedBaseDamage(20)).toBe(20);
    expect(bombDisplayedBaseDamage(20, blessed)).toBe(40);
    expect(bombDisplayedBaseDamage(40, blessed)).toBe(60);
    expect(bombDisplayedBaseDamage(60, blessed)).toBe(80);
    expect(bombKnowledgeDamageBonus(10)).toBe(4);
    expect(bombKnowledgeDamageBonus(10, blessed)).toBe(6);
  });

  it("blocks bomb crafting until the hall is repaired at half the build cost", () => {
    const wrecked = stateOf({
      buildings: { alchemistHall: 1 },
      resources: { iron: 200, black_powder: 100, wood: 10000, stone: 10000, steel: 2000 },
      story: { seen: { alchemistHallDestroyed: true, alchemistArrives: true, portalDiscovered: true } },
    });
    expect(canExecuteAction("craftEmberBomb", wrecked)).toBe(false);
    expect(shouldShowAction("buildRepairAlchemistHall", wrecked)).toBe(true);

    const hallCost = villageBuildActions.buildAlchemistHall.cost as Record<
      number,
      Record<string, number>
    >;
    const repairCost = villageBuildActions.buildRepairAlchemistHall.cost as Record<
      number,
      Record<string, number>
    >;
    expect(repairCost[1]["resources.wood"]).toBe(hallCost[1]["resources.wood"] / 2);
    expect(repairCost[1]["resources.stone"]).toBe(hallCost[1]["resources.stone"] / 2);
    expect(repairCost[1]["resources.steel"]).toBe(hallCost[1]["resources.steel"] / 2);

    const repaired = executeGameAction("buildRepairAlchemistHall", wrecked);
    expect(repaired.stateUpdates.story?.seen.alchemistHallDestroyed).toBe(false);
    expect(repaired.stateUpdates.resources?.wood).toBe(7500);
    expect(repaired.stateUpdates.buildings?.alchemistHall).toBeUndefined();

    const open = stateOf({
      ...wrecked,
      story: { seen: { ...wrecked.story.seen, alchemistHallDestroyed: false } },
    });
    expect(canExecuteAction("craftEmberBomb", open)).toBe(true);
    expect(shouldShowAction("buildRepairAlchemistHall", open)).toBe(false);
  });
});
