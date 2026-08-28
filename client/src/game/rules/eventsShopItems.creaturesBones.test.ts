import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { applyGameStateLoadMigrations } from "@/game/stateHelpers";
import { caveCraftWeapons } from "./caveCraftWeapons";
import { shopItemEvents } from "./eventsShopItems";
import { shouldShowAction } from "./index";

function baseState(overrides: Record<string, unknown> = {}) {
  return gameStateSchema.parse({
    buildings: { blacksmith: 1 },
    resources: { bones: 100, silver: 500 },
    story: { seen: {} },
    ...overrides,
  });
}

describe("lake creature Creature's Bones relic", () => {
  it("End of an Age grants the relic instead of bones", () => {
    const state = baseState({
      story: { seen: { lakeCreatureSpared: true } },
    });
    const result = shopItemEvents.lakeCreatureDead.choices![0].effect(state);

    expect(result.relics?.creatures_bones).toBe(true);
    expect(result.resources?.bones).toBeUndefined();
    expect(result.story?.seen?.ashenGreatshieldUnlocked).toBe(true);
  });

  it("killing the lake creature grants the same relic instead of bones", () => {
    const state = baseState({
      story: { seen: { lakeCreatureLured: true } },
    });
    const result = shopItemEvents.lakeCreatureFate.choices![0].effect(state);

    expect(result.relics?.creatures_bones).toBe(true);
    expect(result.resources?.bones).toBeUndefined();
  });

  it("the relic unlocks Ashen Greatshield craft and is consumed", () => {
    const craft = caveCraftWeapons.craftAshenGreatshield;
    expect(craft.show_when["relics.creatures_bones"]).toBe(true);
    expect(craft.cost["relics.creatures_bones"]).toBe(true);
    expect(craft.cost["resources.bones"]).toBeUndefined();
    expect(craft.cost["resources.silver"]).toBe(500);

    expect(
      shouldShowAction(
        "craftAshenGreatshield",
        baseState({ relics: { creatures_bones: true } }),
      ),
    ).toBe(true);
    expect(shouldShowAction("craftAshenGreatshield", baseState())).toBe(false);
  });

  it("load-migrates old shield unlocks that never received the relic", () => {
    const unlocked = applyGameStateLoadMigrations(
      baseState({
        story: { seen: { ashenGreatshieldUnlocked: true } },
      }),
    );
    expect(unlocked.relics.creatures_bones).toBe(true);

    const alreadyCrafted = applyGameStateLoadMigrations(
      baseState({
        story: { seen: { ashenGreatshieldUnlocked: true } },
        weapons: { ashen_greatshield: true },
      }),
    );
    expect(alreadyCrafted.relics.creatures_bones).toBe(false);
  });
});
