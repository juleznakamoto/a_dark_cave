import { describe, expect, it } from "vitest";
import { createInitialState } from "@/game/state";
import { updateResource } from "@/game/stateHelpers";
import {
  STORAGE_MAXER_RESOURCE_KEYS,
  collectStorageMaxHitSeenUpdates,
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
    expect(collectStorageMaxHitSeenUpdates(state, state.resources)).toEqual({});

    state.buildings.greatVault = 1;
    const hits = collectStorageMaxHitSeenUpdates(state, state.resources);
    expect(hits.storageMaxHit_wood).toBe(true);
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
      ...state, ...afterInsight, resources: {
        ...state.resources,
        ...afterInsight.resources,
      }, story: afterInsight.story ?? state.story
    };
    const afterWood = updateResource(withInsight, "wood", 10);
    expect(afterWood.story?.seen?.storageMaxHit_wood).toBe(true);
    expect(
      getResourcesReachedStorageMaxCount({
        ...withInsight,
        ...afterWood,
        story: afterWood.story ?? withInsight.story,
      }),
    ).toBe(1);
  });
});
