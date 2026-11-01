import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/featureFlags", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/featureFlags")>();
  return { ...actual, PACTS_ENABLED: true };
});
import { GameState } from "@shared/schema";
import { createInitialState, useGameStore } from "../state";
import { getActionBonuses } from "./effectsCalculation";
import { DISGRACED_PRIOR_FOOD_PER_ASSIGNED_ACTION_PER_CYCLE } from "./skillUpgrades";
import { getDisgracedPriorFoodUpkeepPerCycle } from "../population";
import {
  canAssignAnotherPriorAction,
  countPriorSlotsUsed,
  hasHuntressPriorSlot,
} from "./pacts";
import { storyEvents } from "./eventsStory";
import "./index";

const HUNTRESS_OFFERED = { seen: { huntressHunts: true as const } };

function priorState(overrides?: Partial<GameState>): GameState {
  const base = createInitialState();
  return {
    ...base,
    ...overrides,
    fellowship: { ...base.fellowship, ...overrides?.fellowship },
    resources: { ...base.resources, ...overrides?.resources },
    story: {
      ...base.story,
      ...overrides?.story,
      seen: { ...base.story.seen, ...overrides?.story?.seen },
    },
    relics: { ...base.relics, tarnished_compass: false },
  };
}

function offerHuntressHunt() {
  const story = useGameStore.getState().story;
  useGameStore.setState({
    story: {
      ...story,
      seen: { ...story.seen, huntressHunts: true },
    },
  });
}

describe("Full Larders huntress slot", () => {
  it("is open only after she offers to hunt", () => {
    expect(
      hasHuntressPriorSlot({
        chosenPacts: ["full_larders"],
        fellowship: { ashwraith_huntress: true },
        story: HUNTRESS_OFFERED,
      }),
    ).toBe(true);
    expect(
      hasHuntressPriorSlot({
        chosenPacts: ["full_larders"],
        fellowship: { ashwraith_huntress: true },
      }),
    ).toBe(false);
    expect(
      hasHuntressPriorSlot({
        chosenPacts: ["full_larders"],
        fellowship: {},
      }),
    ).toBe(false);
    expect(
      hasHuntressPriorSlot({
        chosenPacts: [],
        fellowship: { ashwraith_huntress: true },
      }),
    ).toBe(false);
  });

  it("does not count Hunt against the Prior's slots", () => {
    expect(countPriorSlotsUsed(["chopWood", "hunt"], true)).toBe(1);
    expect(countPriorSlotsUsed(["chopWood", "hunt"], false)).toBe(2);
    expect(canAssignAnotherPriorAction("hunt", ["chopWood"], 1, true)).toBe(
      true,
    );
    expect(
      canAssignAnotherPriorAction("mineStone", ["chopWood", "hunt"], 1, true),
    ).toBe(false);
    expect(canAssignAnotherPriorAction("hunt", ["chopWood"], 1, false)).toBe(
      false,
    );
  });

  it("applies the Prior reward bonus to an assigned Hunt", () => {
    const state = priorState({
      fellowship: { disgraced_prior: true, ashwraith_huntress: true },
      chosenPacts: ["full_larders"],
      disgracedPriorSkills: { level: 2 },
      priorAssignedActions: ["chopWood", "hunt"],
      story: HUNTRESS_OFFERED,
    });
    expect(getActionBonuses("hunt", state).resourceMultiplier).toBe(2.5);
    expect(getActionBonuses("mineStone", state).resourceMultiplier).toBe(1);
  });

  it("does not charge food for the Huntress slot", () => {
    expect(
      getDisgracedPriorFoodUpkeepPerCycle({
        fellowship: { ashwraith_huntress: true },
        chosenPacts: ["full_larders"],
        priorAssignedActions: ["hunt"],
        story: HUNTRESS_OFFERED,
      }),
    ).toBe(0);
    expect(
      getDisgracedPriorFoodUpkeepPerCycle({
        fellowship: { disgraced_prior: true, ashwraith_huntress: true },
        chosenPacts: ["full_larders"],
        priorAssignedActions: ["chopWood", "hunt"],
        story: HUNTRESS_OFFERED,
      }),
    ).toBe(DISGRACED_PRIOR_FOOD_PER_ASSIGNED_ACTION_PER_CYCLE);
    expect(
      getDisgracedPriorFoodUpkeepPerCycle({
        fellowship: { disgraced_prior: true, ashwraith_huntress: true },
        chosenPacts: [],
        priorAssignedActions: ["hunt"],
      }),
    ).toBe(DISGRACED_PRIOR_FOOD_PER_ASSIGNED_ACTION_PER_CYCLE);
  });
});

describe("togglePriorAction huntress slot", () => {
  beforeEach(() => {
    useGameStore.getState().initialize();
  });

  it("assigns Hunt when the Prior is already at capacity", () => {
    useGameStore.setState({
      fellowship: { disgraced_prior: true, ashwraith_huntress: true },
      chosenPacts: ["full_larders"],
      disgracedPriorSkills: { level: 0 },
      priorAssignedActions: ["chopWood"],
      cooldowns: { hunt: 10, chopWood: 10, mineStone: 10 },
    });
    offerHuntressHunt();

    useGameStore.getState().togglePriorAction("hunt");
    expect(useGameStore.getState().priorAssignedActions).toEqual([
      "chopWood",
      "hunt",
    ]);

    useGameStore.getState().togglePriorAction("mineStone");
    expect(useGameStore.getState().priorAssignedActions).toEqual([
      "chopWood",
      "hunt",
    ]);
  });

  it("keeps Hunt on a normal Prior slot without the pact", () => {
    useGameStore.setState({
      fellowship: { disgraced_prior: true, ashwraith_huntress: true },
      chosenPacts: [],
      disgracedPriorSkills: { level: 0 },
      priorAssignedActions: ["chopWood"],
      cooldowns: { hunt: 10 },
    });

    useGameStore.getState().togglePriorAction("hunt");
    expect(useGameStore.getState().priorAssignedActions).toEqual(["chopWood"]);
  });

  it("lets the Huntress take Hunt before the Prior joins", () => {
    useGameStore.setState({
      fellowship: { ashwraith_huntress: true },
      chosenPacts: ["full_larders"],
      priorAssignedActions: [],
      cooldowns: { hunt: 10, chopWood: 10 },
    });
    offerHuntressHunt();

    useGameStore.getState().togglePriorAction("hunt");
    expect(useGameStore.getState().priorAssignedActions).toEqual(["hunt"]);

    useGameStore.getState().togglePriorAction("chopWood");
    expect(useGameStore.getState().priorAssignedActions).toEqual(["hunt"]);
  });

  it("refuses Hunt until she offers, even with the pact", () => {
    useGameStore.setState({
      fellowship: { ashwraith_huntress: true },
      chosenPacts: ["full_larders"],
      priorAssignedActions: [],
      cooldowns: { hunt: 10 },
    });

    useGameStore.getState().togglePriorAction("hunt");
    expect(useGameStore.getState().priorAssignedActions).toEqual([]);
  });
});

describe("huntressOffersToHunt", () => {
  it("is a regular event that opens her Hunt slot", () => {
    const base = createInitialState();
    const ready: GameState = {
      ...base,
      fellowship: { ...base.fellowship, ashwraith_huntress: true },
      chosenPacts: ["full_larders"],
    };
    const event = storyEvents.huntressOffersToHunt;
    expect(event.timeProbability).toBe(5);
    expect(event.showAsTimedTab).toBeUndefined();
    expect(event.timedTabDuration).toBeUndefined();
    expect(event.condition?.(ready)).toBe(true);
    expect(event.condition?.({ ...ready, chosenPacts: [] })).toBe(false);
    expect(
      event.condition?.({
        ...ready,
        fellowship: { ...ready.fellowship, ashwraith_huntress: false },
      }),
    ).toBe(false);

    const choices = event.choices;
    if (!Array.isArray(choices)) throw new Error("expected fixed choices");
    const patch = choices[0].effect?.(ready);
    expect(patch?.story?.seen.huntressHunts).toBe(true);
    expect(
      hasHuntressPriorSlot({
        ...ready,
        story: patch?.story ?? ready.story,
      }),
    ).toBe(true);
    expect(event.condition?.({ ...ready, story: patch?.story ?? ready.story })).toBe(
      false,
    );
  });
});
