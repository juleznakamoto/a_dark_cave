import { describe, it, expect, beforeEach } from "vitest";
import {
  ACHIEVEMENT_TITLE_INSIGHT_COST_TIER_0,
  BUILDING_DESCRIPTIONS_INSIGHT_KEY,
  CRAFT_DESCRIPTIONS_INSIGHT_KEY,
  getAchievementTitleInsightKey,
  PRESET_UNLOCK_INSIGHT_KEY,
  TIMED_EVENT_INSIGHT_PROLONG_KEY,
  TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
  TIMED_EVENT_TAB_PROLONG_MS,
} from "./rules/insightReveal";
import { createInitialState, useGameStore } from "./state";

describe("revealBuildingDescriptions", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("does nothing (descriptions are always unlocked)", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
        buildersLodge: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 3000,
      },
    });

    expect(useGameStore.getState().revealBuildingDescriptions()).toBe(false);
    expect(useGameStore.getState().resources.insight).toBe(3000);
  });

  it("clears expired buildingDescriptions reveal animation keys", () => {
    useGameStore.setState({
      buildingDescriptionsRevealed: false,
      insightRevealing: {
        [BUILDING_DESCRIPTIONS_INSIGHT_KEY]: Date.now() - 1,
      },
    });

    useGameStore.getState().tickCooldowns();

    const after = useGameStore.getState();
    expect(after.buildingDescriptionsRevealed).toBe(true);
    expect(after.insightRevealing[BUILDING_DESCRIPTIONS_INSIGHT_KEY]).toBeUndefined();
  });
});

describe("revealCraftDescriptions", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("does nothing (descriptions are always unlocked)", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
        blacksmith: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 3000,
      },
    });

    expect(useGameStore.getState().revealCraftDescriptions()).toBe(false);
    expect(useGameStore.getState().resources.insight).toBe(3000);
  });

  it("clears expired craftDescriptions reveal animation keys", () => {
    useGameStore.setState({
      craftDescriptionsRevealed: false,
      insightRevealing: {
        [CRAFT_DESCRIPTIONS_INSIGHT_KEY]: Date.now() - 1,
      },
    });

    useGameStore.getState().tickCooldowns();

    const after = useGameStore.getState();
    expect(after.craftDescriptionsRevealed).toBe(true);
    expect(after.insightRevealing[CRAFT_DESCRIPTIONS_INSIGHT_KEY]).toBeUndefined();
  });
});

describe("prolongTimedEventTab", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("extends expiry and deducts insight when affordable", () => {
    const expiryTime = Date.now() + 60_000;
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 600,
      },
      timedEventTab: {
        isActive: true,
        event: { id: "merchant-test", message: "m", title: "t" },
        expiryTime,
        startTime: Date.now(),
        pauseAccumMs: 0,
        pauseStartedAt: 0,
      },
    });

    const ok = useGameStore.getState().prolongTimedEventTab();
    expect(ok).toBe(true);

    const after = useGameStore.getState();
    expect(after.resources.insight).toBe(
      600 - TIMED_EVENT_TAB_PROLONG_INSIGHT_COST,
    );
    expect(after.timedEventTab.expiryTime).toBe(
      expiryTime + TIMED_EVENT_TAB_PROLONG_MS,
    );
    expect(after.timedEventTab.insightProlongUsed).toBe(true);
    expect(
      after.insightRevealing[TIMED_EVENT_INSIGHT_PROLONG_KEY],
    ).toBeGreaterThan(Date.now());
  });

  it("cannot prolong twice in the same timed-tab visit", () => {
    const expiryTime = Date.now() + 60_000;
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 600,
      },
      timedEventTab: {
        isActive: true,
        event: { id: "merchant-test", message: "m", title: "t" },
        expiryTime,
        startTime: Date.now(),
        pauseAccumMs: 0,
        pauseStartedAt: 0,
        insightProlongUsed: true,
      },
    });

    expect(useGameStore.getState().prolongTimedEventTab()).toBe(false);
    expect(useGameStore.getState().resources.insight).toBe(600);
    expect(useGameStore.getState().timedEventTab.expiryTime).toBe(expiryTime);
  });

  it("does nothing without Clerks Hut or insufficient insight", () => {
    const expiryTime = Date.now() + 60_000;
    useGameStore.setState({
      resources: {
        ...useGameStore.getState().resources,
        insight: 100,
      },
      timedEventTab: {
        isActive: true,
        event: { id: "merchant-test", message: "m", title: "t" },
        expiryTime,
        startTime: Date.now(),
      },
    });

    expect(useGameStore.getState().prolongTimedEventTab()).toBe(false);
    expect(useGameStore.getState().timedEventTab.expiryTime).toBe(expiryTime);

    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 10,
      },
    });
    expect(useGameStore.getState().prolongTimedEventTab()).toBe(false);
  });
});

describe("createInitialState insight fields", () => {
  it("includes insight, scholar, and reveal defaults", () => {
    const state = createInitialState();
    expect(state.resources.insight).toBe(0);
    expect(state.villagers.scholar).toBe(0);
    expect(state.revealedEffects).toEqual([]);
    expect(state.buildingDescriptionsRevealed).toBe(false);
    expect(state.craftDescriptionsRevealed).toBe(false);
  });
});

describe("purchaseVillagerPresetSlot", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("deducts insight, unlocks the slot immediately, and starts reveal animation", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
        scribesOffice: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 2500,
      },
      villagerPresetsPurchased: 0,
    });

    const ok = useGameStore.getState().purchaseVillagerPresetSlot();
    expect(ok).toBe(true);

    const after = useGameStore.getState();
    expect(after.resources.insight).toBe(0);
    expect(after.villagerPresetsPurchased).toBe(1);
    expect(after.activePresetSlot).toBe(1);
    expect(after.insightRevealing[PRESET_UNLOCK_INSIGHT_KEY]).toBeGreaterThan(
      Date.now(),
    );
  });

  it("does not double-unlock when the reveal animation finishes", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        scribesOffice: 1,
      },
      villagerPresetsPurchased: 1,
      insightRevealing: {
        [PRESET_UNLOCK_INSIGHT_KEY]: Date.now() - 1,
      },
    });

    useGameStore.getState().tickCooldowns();

    const after = useGameStore.getState();
    expect(after.villagerPresetsPurchased).toBe(1);
    expect(after.insightRevealing[PRESET_UNLOCK_INSIGHT_KEY]).toBeUndefined();
  });

  it("can unlock multiple slots and save/apply each independently", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
        scribesOffice: 1,
        recordsHall: 1,
        grandArchive: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 50_000,
      },
      villagers: {
        ...useGameStore.getState().villagers,
        free: 10,
        gatherer: 0,
        hunter: 0,
      },
      villagerPresetsPurchased: 0,
    });

    expect(useGameStore.getState().purchaseVillagerPresetSlot()).toBe(true);
    expect(useGameStore.getState().villagerPresetsPurchased).toBe(1);

    // Clear reveal lock so the next purchase is allowed immediately in tests.
    useGameStore.setState({ insightRevealing: {} });
    expect(useGameStore.getState().purchaseVillagerPresetSlot()).toBe(true);
    expect(useGameStore.getState().villagerPresetsPurchased).toBe(2);
    useGameStore.setState({ insightRevealing: {} });
    expect(useGameStore.getState().purchaseVillagerPresetSlot()).toBe(true);
    expect(useGameStore.getState().villagerPresetsPurchased).toBe(3);
    useGameStore.setState({ insightRevealing: {} });
    expect(useGameStore.getState().purchaseVillagerPresetSlot()).toBe(true);
    expect(useGameStore.getState().villagerPresetsPurchased).toBe(4);

    useGameStore.setState({
      villagers: {
        ...useGameStore.getState().villagers,
        free: 7,
        gatherer: 3,
        hunter: 0,
      },
    });
    expect(useGameStore.getState().saveVillagerJobPreset(1)).toBe(true);

    useGameStore.setState({
      villagers: {
        ...useGameStore.getState().villagers,
        free: 6,
        gatherer: 0,
        hunter: 4,
      },
      activePresetSlot: 2,
    });
    expect(useGameStore.getState().saveVillagerJobPreset(2)).toBe(true);

    useGameStore.getState().applyVillagerJobPreset(1);
    expect(useGameStore.getState().villagers.gatherer).toBe(3);
    expect(useGameStore.getState().activePresetSlot).toBe(1);

    useGameStore.getState().applyVillagerJobPreset(2);
    expect(useGameStore.getState().villagers.hunter).toBe(4);
    expect(useGameStore.getState().activePresetSlot).toBe(2);

    expect(useGameStore.getState().saveVillagerJobPreset(5)).toBe(false);
  });
});

describe("revealAchievementTitle", () => {
  const achievementId = "item-0-leather";

  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("deducts insight, reveals the title immediately, and starts reveal animation", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: ACHIEVEMENT_TITLE_INSIGHT_COST_TIER_0,
      },
      revealedAchievementTitles: [],
    });

    const ok = useGameStore
      .getState()
      .revealAchievementTitle(achievementId, 0);
    expect(ok).toBe(true);

    const after = useGameStore.getState();
    expect(after.resources.insight).toBe(0);
    expect(after.revealedAchievementTitles).toContain(achievementId);
    expect(
      after.insightRevealing[getAchievementTitleInsightKey(achievementId)],
    ).toBeGreaterThan(Date.now());
  });

  it("does not re-add the title when the reveal animation finishes", () => {
    useGameStore.setState({
      revealedAchievementTitles: [achievementId],
      insightRevealing: {
        [getAchievementTitleInsightKey(achievementId)]: Date.now() - 1,
      },
    });

    useGameStore.getState().tickCooldowns();

    const after = useGameStore.getState();
    expect(after.revealedAchievementTitles).toEqual([achievementId]);
    expect(
      after.insightRevealing[getAchievementTitleInsightKey(achievementId)],
    ).toBeUndefined();
  });
});
