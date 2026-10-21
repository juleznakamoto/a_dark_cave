import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { shouldShowAction } from "./index";
import { villageAttackEvents } from "./eventsVillageAttacks";
import { migrateTrapSuggestionUnlockOnLoad } from "@/game/stateHelpers";

describe("trapSuggestion", () => {
  it("is eligible only after the first wolf attack, until traps are unlocked", () => {
    const before = gameStateSchema.parse({});
    expect(villageAttackEvents.trapSuggestion.condition(before)).toBe(false);

    const afterWolf = gameStateSchema.parse({
      story: { seen: { firstWolfAttack: true } },
    });
    expect(villageAttackEvents.trapSuggestion.condition(afterWolf)).toBe(true);

    const unlocked = gameStateSchema.parse({
      story: {
        seen: { firstWolfAttack: true, villageTrapsSuggested: true },
      },
    });
    expect(villageAttackEvents.trapSuggestion.condition(unlocked)).toBe(false);
  });

  it("unlocks buildTraps when the suggestion is accepted", () => {
    const locked = gameStateSchema.parse({
      story: { seen: { firstWolfAttack: true } },
    });
    expect(shouldShowAction("buildTraps", locked)).toBe(false);

    const choice = villageAttackEvents.trapSuggestion.choices?.[0];
    expect(choice?.id).toBe("prepareTraps");
    const result = choice!.effect(locked);
    const unlocked = gameStateSchema.parse({
      ...locked,
      story: result.story,
    });
    expect(unlocked.story.seen.villageTrapsSuggested).toBe(true);
    expect(shouldShowAction("buildTraps", unlocked)).toBe(true);
  });

  it("grandfathers legacy saves that already saw the first wolf attack", () => {
    const legacy = gameStateSchema.parse({
      story: { seen: { firstWolfAttack: true } },
    });
    const migrated = migrateTrapSuggestionUnlockOnLoad(legacy);
    expect(migrated?.story?.seen.villageTrapsSuggested).toBe(true);
    expect(migrated?.story?.seen.trapSuggestionV2Applied).toBe(true);

    const again = migrateTrapSuggestionUnlockOnLoad({
      story: migrated!.story!,
    });
    expect(again).toBeNull();
  });

  it("does not grandfather fresh saves that have not faced wolves yet", () => {
    const fresh = gameStateSchema.parse({});
    const migrated = migrateTrapSuggestionUnlockOnLoad(fresh);
    expect(migrated?.story?.seen.trapSuggestionV2Applied).toBe(true);
    expect(migrated?.story?.seen.villageTrapsSuggested).toBeUndefined();
  });
});
