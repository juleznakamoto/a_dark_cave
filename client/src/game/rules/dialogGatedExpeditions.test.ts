import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { gameEvents } from "./events";
import {
  forestScoutActions,
  handleExploreMountainVillage,
  handleSwampSanctuary,
} from "./forestScoutActions";
import { migrateDialogGatedExpeditionSoftLocks } from "@/game/stateHelpers";
import type { ActionResult } from "@/game/actions";
import { shouldShowAction } from "./index";

function baseState(overrides: Record<string, unknown> = {}) {
  return gameStateSchema.parse({
    flags: { forestUnlocked: true },
    ...overrides,
  });
}

function emptyResult(): ActionResult {
  return { stateUpdates: {}, logEntries: [], delayedEffects: [] };
}

describe("dialog-gated expeditions", () => {
  describe("exploreMountainVillage / theHoundFound", () => {
    it("does not consume the map or mark explored until Accept", () => {
      const state = baseState({
        tools: { mountain_village_map: true },
      });
      const result = handleExploreMountainVillage(state, emptyResult());

      expect(result.stateUpdates.tools?.mountain_village_map).toBeUndefined();
      expect(result.stateUpdates.story?.seen?.mountainVillageExplored).toBeUndefined();
      expect(result.logEntries?.[0]?.eventId).toBe("theHoundFound");

      const accept = gameEvents.theHoundFound.choices![0].effect(state);
      expect(accept.fellowship?.the_hound).toBe(true);
      expect(accept.tools?.mountain_village_map).toBe(false);
      expect(accept.story?.seen?.mountainVillageExplored).toBe(true);
      expect(accept.story?.seen?.theHoundJoined).toBe(true);
    });

    it("stays visible while the map is held and The Hound is not joined", () => {
      const available = baseState({
        tools: { mountain_village_map: true },
        fellowship: { the_hound: false },
      });
      expect(shouldShowAction("exploreMountainVillage", available)).toBe(true);

      const done = baseState({
        tools: { mountain_village_map: false },
        fellowship: { the_hound: true },
        story: { seen: { theHoundJoined: true, mountainVillageExplored: true } },
      });
      expect(shouldShowAction("exploreMountainVillage", done)).toBe(false);
    });
  });

  describe("swampSanctuary / swampSanctuaryChoice", () => {
    it("does not mark explored on expedition return", () => {
      const state = baseState({
        story: { seen: { swampMapAssembled: true } },
      });
      const result = handleSwampSanctuary(state, emptyResult());
      expect(result.stateUpdates.story?.seen?.swampSanctuaryExplored).toBeUndefined();
      expect(result.logEntries?.[0]?.eventId).toBe("swampSanctuaryChoice");
    });

    it("marks explored when a sanctuary choice is made", () => {
      const state = baseState({
        story: { seen: { swampMapAssembled: true } },
      });
      const chop = gameEvents.swampSanctuaryChoice.choices!.find(
        (c) => c.id === "chopBlackTree",
      )!;
      const result = chop.effect(state);
      expect(result.story?.seen?.swampSanctuaryChoiceMade).toBe(true);
      expect(result.story?.seen?.swampSanctuaryExplored).toBe(true);
    });

    it("show_when uses choiceMade, not explored", () => {
      expect(forestScoutActions.swampSanctuary.show_when).toMatchObject({
        "story.seen.swampMapAssembled": true,
        "!story.seen.swampSanctuaryChoiceMade": true,
      });
    });
  });

  describe("migrateDialogGatedExpeditionSoftLocks", () => {
    it("restores mountain village when explored without The Hound", () => {
      const state = baseState({
        tools: { mountain_village_map: false },
        fellowship: { the_hound: false },
        story: { seen: { mountainVillageExplored: true } },
      });
      const patch = migrateDialogGatedExpeditionSoftLocks(state);
      expect(patch?.tools?.mountain_village_map).toBe(true);
      expect(patch?.story?.seen?.mountainVillageExplored).toBe(false);
    });

    it("clears swamp explored when choice was never made", () => {
      const state = baseState({
        story: {
          seen: {
            swampMapAssembled: true,
            swampSanctuaryExplored: true,
          },
        },
      });
      const patch = migrateDialogGatedExpeditionSoftLocks(state);
      expect(patch?.story?.seen?.swampSanctuaryExplored).toBe(false);
    });

    it("does not touch completed dialog-gated runs", () => {
      const state = baseState({
        tools: { mountain_village_map: false },
        fellowship: { the_hound: true },
        story: {
          seen: {
            mountainVillageExplored: true,
            theHoundJoined: true,
            swampSanctuaryExplored: true,
            swampSanctuaryChoiceMade: true,
          },
        },
      });
      expect(migrateDialogGatedExpeditionSoftLocks(state)).toBeNull();
    });
  });
});
