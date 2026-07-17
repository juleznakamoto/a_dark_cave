import { describe, it, expect, beforeEach } from "vitest";
import {
  BUILDING_DESCRIPTIONS_INSIGHT_KEY,
  CRAFT_DESCRIPTIONS_INSIGHT_KEY,
  BUILDING_DESCRIPTIONS_INSIGHT_COST,
  CRAFT_DESCRIPTIONS_INSIGHT_COST,
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

  it("deducts insight and starts reveal animation before flag is set", () => {
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

    const ok = useGameStore.getState().revealBuildingDescriptions();
    expect(ok).toBe(true);

    const after = useGameStore.getState();
    expect(after.resources.insight).toBe(
      3000 - BUILDING_DESCRIPTIONS_INSIGHT_COST,
    );
    expect(after.buildingDescriptionsRevealed).toBeFalsy();
    expect(
      after.insightRevealing[BUILDING_DESCRIPTIONS_INSIGHT_KEY],
    ).toBeGreaterThan(Date.now());
  });

  it("does nothing without prerequisites or insufficient insight", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
        buildersLodge: 0,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 3000,
      },
    });
    expect(useGameStore.getState().revealBuildingDescriptions()).toBe(false);

    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        buildersLodge: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 100,
      },
    });
    expect(useGameStore.getState().revealBuildingDescriptions()).toBe(false);
    expect(useGameStore.getState().resources.insight).toBe(100);
  });

  it("sets buildingDescriptionsRevealed after reveal window", () => {
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

  it("deducts insight and starts reveal animation before flag is set", () => {
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

    const ok = useGameStore.getState().revealCraftDescriptions();
    expect(ok).toBe(true);

    const after = useGameStore.getState();
    expect(after.resources.insight).toBe(
      3000 - CRAFT_DESCRIPTIONS_INSIGHT_COST,
    );
    expect(after.craftDescriptionsRevealed).toBeFalsy();
    expect(
      after.insightRevealing[CRAFT_DESCRIPTIONS_INSIGHT_KEY],
    ).toBeGreaterThan(Date.now());
  });

  it("does nothing without prerequisites or insufficient insight", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        clerksHut: 1,
        blacksmith: 0,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 3000,
      },
    });
    expect(useGameStore.getState().revealCraftDescriptions()).toBe(false);

    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        blacksmith: 1,
      },
      resources: {
        ...useGameStore.getState().resources,
        insight: 100,
      },
    });
    expect(useGameStore.getState().revealCraftDescriptions()).toBe(false);
    expect(useGameStore.getState().resources.insight).toBe(100);
  });

  it("sets craftDescriptionsRevealed after reveal window", () => {
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

  it("deducts insight and starts reveal animation before unlocking the slot", () => {
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
    expect(after.villagerPresetsPurchased).toBe(0);
    expect(after.insightRevealing[PRESET_UNLOCK_INSIGHT_KEY]).toBeGreaterThan(
      Date.now(),
    );
  });

  it("unlocks the preset slot after the reveal window", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        scribesOffice: 1,
      },
      villagerPresetsPurchased: 0,
      insightRevealing: {
        [PRESET_UNLOCK_INSIGHT_KEY]: Date.now() - 1,
      },
    });

    useGameStore.getState().tickCooldowns();

    const after = useGameStore.getState();
    expect(after.villagerPresetsPurchased).toBe(1);
    expect(after.activePresetSlot).toBe(1);
    expect(after.insightRevealing[PRESET_UNLOCK_INSIGHT_KEY]).toBeUndefined();
  });

  it("selects the newly unlocked slot even when another slot is already active", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        scribesOffice: 1,
      },
      villagerPresetsPurchased: 1,
      activePresetSlot: 1,
      insightRevealing: {
        [PRESET_UNLOCK_INSIGHT_KEY]: Date.now() - 1,
      },
    });

    useGameStore.getState().tickCooldowns();

    const after = useGameStore.getState();
    expect(after.villagerPresetsPurchased).toBe(2);
    expect(after.activePresetSlot).toBe(2);
  });

  it("saves and applies a second unlocked preset slot", () => {
    useGameStore.setState({
      buildings: {
        ...useGameStore.getState().buildings,
        scribesOffice: 1,
      },
      villagerPresetsPurchased: 2,
      activePresetSlot: 1,
      villagers: {
        ...useGameStore.getState().villagers,
        free: 5,
        gatherer: 3,
        hunter: 0,
      },
    });

    useGameStore.getState().saveVillagerJobPreset(2);
    expect(useGameStore.getState().activePresetSlot).toBe(2);
    expect(
      useGameStore.getState().villagerJobPresets?.[1]?.assignments,
    ).toEqual({ gatherer: 3 });

    useGameStore.setState({
      villagers: {
        ...useGameStore.getState().villagers,
        free: 8,
        gatherer: 0,
        hunter: 0,
      },
      activePresetSlot: 1,
    });

    useGameStore.getState().applyVillagerJobPreset(2);
    const after = useGameStore.getState();
    expect(after.activePresetSlot).toBe(2);
    expect(after.villagers.gatherer).toBe(3);
    expect(after.villagers.free).toBe(5);
  });
});
