import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import { updateResource } from "@/game/stateHelpers";
import {
  STORAGE_MAXER_RESOURCE_KEYS,
  collectStorageMaxHitUpdates,
  getResourcesReachedStorageMaxCount,
  getStorageMaxerResourceTotal,
} from "./resourceStorageMax";

describe("resourceStorageMax", () => {
  it("exposes a stable count of warehouse resources", () => {
    expect(getStorageMaxerResourceTotal()).toBe(
      STORAGE_MAXER_RESOURCE_KEYS.length,
    );
    expect(getStorageMaxerResourceTotal()).toBeGreaterThan(10);
  });

  it("only records hits when Great Vault is owned", () => {
    const state = createInitialState();
    state.buildings.greatVault = 0;
    state.resources.wood = 50000;
    expect(collectStorageMaxHitUpdates(state, state.resources)).toEqual({
      storySeen: {},
    });

    state.buildings.greatVault = 1;
    const hits = collectStorageMaxHitUpdates(state, state.resources);
    expect(hits.storySeen.storageMaxHit_wood).toBe(true);
    expect(hits.lifetimeStorageMaxHits).toContain("wood");
  });

  it("tracks insight spend and storage max hits via updateResource", () => {
    const state = createInitialState();
    state.buildings.greatVault = 1;
    state.resources.insight = 500;
    state.resources.wood = 49999;

    const afterInsight = updateResource(state, "insight", -120);
    expect(afterInsight.story?.seen?.totalInsightSpent).toBe(120);
    expect(afterInsight.resources?.insight).toBe(380);

    const withInsight = {
      ...state,
      ...afterInsight,
      resources: {
        ...state.resources,
        ...afterInsight.resources,
      },
      story: afterInsight.story ?? state.story,
    };
    const afterWood = updateResource(withInsight, "wood", 10);
    expect(afterWood.story?.seen?.storageMaxHit_wood).toBe(true);
    expect(afterWood.lifetimeStorageMaxHits).toContain("wood");
    expect(
      getResourcesReachedStorageMaxCount({
        ...withInsight,
        ...afterWood,
        story: afterWood.story ?? withInsight.story,
        lifetimeStorageMaxHits:
          afterWood.lifetimeStorageMaxHits ??
          withInsight.lifetimeStorageMaxHits,
      }),
    ).toBe(1);
  });

  it("counts lifetime hits even when story.seen was cleared", () => {
    const state = createInitialState();
    state.lifetimeStorageMaxHits = ["wood", "stone"];
    state.story = { seen: {}, merchantPurchases: 0 };
    expect(getResourcesReachedStorageMaxCount(state)).toBe(2);
  });
});
