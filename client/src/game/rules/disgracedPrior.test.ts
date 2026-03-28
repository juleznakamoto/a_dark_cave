import { describe, it, expect } from "vitest";
import { GameState } from "@shared/schema";
import { createInitialState } from "../state";
import { getActionBonuses } from "./effectsCalculation";
import { applyActionEffects } from "./actionEffects";
import { DISGRACED_PRIOR_UPGRADES } from "./skillUpgrades";

// Import index to register all actions
import "./index";

function createMockState(overrides?: Partial<GameState>): GameState {
  const base = createInitialState();
  return {
    ...base,
    ...overrides,
    resources: { ...base.resources, ...overrides?.resources },
    tools: { ...base.tools, ...overrides?.tools },
    buildings: { ...base.buildings, ...overrides?.buildings },
    relics: { ...base.relics, tarnished_compass: false }, // disable random double-proc
  };
}

// Base state: Prior in fellowship, assigned to chopWood, at a given skill level
function priorState(level: number, assignedActions: string[] = ["chopWood"]): GameState {
  return createMockState({
    fellowship: { disgraced_prior: true },
    disgracedPriorSkills: { level },
    priorAssignedActions: assignedActions,
  });
}

// ─── Upgrade table shape ──────────────────────────────────────────────────────

describe("DISGRACED_PRIOR_UPGRADES table", () => {
  it("has 6 levels (0–5)", () => {
    expect(DISGRACED_PRIOR_UPGRADES).toHaveLength(6);
  });

  it("odd levels add an action slot, even levels add a reward multiplier", () => {
    // Actions grow on levels 1, 3, 5
    expect(DISGRACED_PRIOR_UPGRADES[1].maxActions).toBe(DISGRACED_PRIOR_UPGRADES[0].maxActions + 1);
    expect(DISGRACED_PRIOR_UPGRADES[3].maxActions).toBe(DISGRACED_PRIOR_UPGRADES[2].maxActions + 1);
    expect(DISGRACED_PRIOR_UPGRADES[5].maxActions).toBe(DISGRACED_PRIOR_UPGRADES[4].maxActions + 1);

    // Multiplier increases on levels 2 and 4
    expect(DISGRACED_PRIOR_UPGRADES[2].rewardMultiplier).toBeGreaterThan(DISGRACED_PRIOR_UPGRADES[1].rewardMultiplier);
    expect(DISGRACED_PRIOR_UPGRADES[4].rewardMultiplier).toBeGreaterThan(DISGRACED_PRIOR_UPGRADES[3].rewardMultiplier);
  });

  it("level 2 gives +100% (×2) and level 4 gives +200% (×3)", () => {
    expect(DISGRACED_PRIOR_UPGRADES[2].rewardMultiplier).toBe(2);
    expect(DISGRACED_PRIOR_UPGRADES[4].rewardMultiplier).toBe(3);
  });

  it("maxActions never decreases as level increases", () => {
    for (let i = 1; i < DISGRACED_PRIOR_UPGRADES.length; i++) {
      expect(DISGRACED_PRIOR_UPGRADES[i].maxActions).toBeGreaterThanOrEqual(
        DISGRACED_PRIOR_UPGRADES[i - 1].maxActions,
      );
    }
  });
});

// ─── getActionBonuses integration ────────────────────────────────────────────

describe("getActionBonuses — Disgraced Prior multiplier", () => {
  it("no bonus at levels 0 and 1 (multiplier = 1)", () => {
    for (const level of [0, 1]) {
      const state = priorState(level);
      const bonuses = getActionBonuses("chopWood", state);
      expect(bonuses.resourceMultiplier).toBe(1);
    }
  });

  it("+100% at level 2: resourceMultiplier is 2", () => {
    const state = priorState(2);
    const bonuses = getActionBonuses("chopWood", state);
    expect(bonuses.resourceMultiplier).toBe(2);
  });

  it("multiplier stays ×2 at level 3", () => {
    const state = priorState(3);
    const bonuses = getActionBonuses("chopWood", state);
    expect(bonuses.resourceMultiplier).toBe(2);
  });

  it("+200% at level 4: resourceMultiplier is 3", () => {
    const state = priorState(4);
    const bonuses = getActionBonuses("chopWood", state);
    expect(bonuses.resourceMultiplier).toBe(3);
  });

  it("multiplier stays ×3 at level 5", () => {
    const state = priorState(5);
    const bonuses = getActionBonuses("chopWood", state);
    expect(bonuses.resourceMultiplier).toBe(3);
  });

  it("bonus only applies to assigned actions, not unassigned ones", () => {
    // Prior assigned to chopWood only
    const state = priorState(2, ["chopWood"]);

    const woodBonuses = getActionBonuses("chopWood", state);
    const stoneBonuses = getActionBonuses("mineStone", state);

    expect(woodBonuses.resourceMultiplier).toBe(2);   // assigned → bonus applies
    expect(stoneBonuses.resourceMultiplier).toBe(1);  // not assigned → no bonus
  });

  it("bonus applies to each action independently when multiple are assigned", () => {
    const state = priorState(4, ["chopWood", "mineStone", "mineIron"]);

    expect(getActionBonuses("chopWood", state).resourceMultiplier).toBe(3);
    expect(getActionBonuses("mineStone", state).resourceMultiplier).toBe(3);
    expect(getActionBonuses("mineIron", state).resourceMultiplier).toBe(3);
  });

  it("no bonus when Prior is not in fellowship", () => {
    const state = createMockState({
      fellowship: {},
      disgracedPriorSkills: { level: 4 },
      priorAssignedActions: ["chopWood"],
    });
    const bonuses = getActionBonuses("chopWood", state);
    expect(bonuses.resourceMultiplier).toBe(1);
  });

  it("no bonus when priorAssignedActions is empty", () => {
    const state = priorState(4, []);
    const bonuses = getActionBonuses("chopWood", state);
    expect(bonuses.resourceMultiplier).toBe(1);
  });

  it("Prior bonus stacks additively with tool bonuses", () => {
    // iron_axe gives +50% wood (resourceMultiplier 1.5)
    // Prior level 2 gives +100% (adds 1.0)
    // Total should be 1 + 0.5 + 1.0 = 2.5
    const state = priorState(2, ["chopWood"]);
    state.tools.iron_axe = true;

    const bonuses = getActionBonuses("chopWood", state);
    expect(bonuses.resourceMultiplier).toBeGreaterThan(2); // tool + prior stacks
  });
});

// ─── applyActionEffects end-to-end ───────────────────────────────────────────

describe("applyActionEffects — Prior multiplier applied to resource output", () => {
  it("chopWood with Prior at level 0 stays within base random range (6–12)", () => {
    const state = priorState(0);
    state.resources.wood = 0;

    const result = applyActionEffects("chopWood", state);
    const gained = (result.resources?.wood ?? 0) - 0;
    expect(gained).toBeGreaterThanOrEqual(6);
    expect(gained).toBeLessThanOrEqual(12);
  });

  it("chopWood with Prior at level 2 stays within scaled random range (12–24)", () => {
    const state = priorState(2);
    state.resources.wood = 0;

    const result = applyActionEffects("chopWood", state);
    const gained = result.resources?.wood ?? 0;
    expect(gained).toBeGreaterThanOrEqual(12);
    expect(gained).toBeLessThanOrEqual(24);
  });

  it("chopWood with Prior at level 4 stays within scaled random range (18–36)", () => {
    const state = priorState(4);
    state.resources.wood = 0;

    const result = applyActionEffects("chopWood", state);
    const gained = result.resources?.wood ?? 0;
    expect(gained).toBeGreaterThanOrEqual(18);
    expect(gained).toBeLessThanOrEqual(36);
  });

  it("mineStone assigned to Prior at level 2 stays within scaled random range (8–16)", () => {
    // No pickaxe equipped (stone_pickaxe gives 1.25× mining bonus which we exclude here
    // to isolate the Prior's contribution). BTP=0 keeps the baseline range(4,8).
    const state = priorState(2, ["mineStone"]);
    state.resources.stone = 0;
    (state as any).BTP = 0;

    const result = applyActionEffects("mineStone", state);
    const gained = (result.resources?.stone ?? 0) - 0;
    expect(gained).toBeGreaterThanOrEqual(8);
    expect(gained).toBeLessThanOrEqual(16);
  });

  it("mineStone NOT assigned to Prior is unaffected by Prior level", () => {
    // Prior at level 4 but mineStone not assigned; no pickaxe to isolate the Prior check
    const state = priorState(4, ["chopWood"]);
    state.resources.stone = 0;
    (state as any).BTP = 0;

    const result = applyActionEffects("mineStone", state);
    const gained = result.resources?.stone ?? 0;
    // Should stay within unmodified base range 4–8
    expect(gained).toBeGreaterThanOrEqual(4);
    expect(gained).toBeLessThanOrEqual(8);
  });

  it("craftTorches assigned to Prior at level 2 yields 2× torches (base 1 → 2)", () => {
    const state = priorState(2, ["craftTorches"]);
    state.resources.wood = 100;
    state.story.seen.hasWood = true;
    state.books = undefined; // No book_of_ascension - base 1 torch

    const result = applyActionEffects("craftTorches", state);
    const gained = result.resources?.torch ?? 0;
    // Base 1 torch × Prior 2 = 2 torches
    expect(gained).toBe(2);
  });

  it("craftBoneTotems assigned to Prior at level 4 yields 3× totems (base 1 → 3)", () => {
    const state = priorState(4, ["craftBoneTotems"]);
    state.resources.bones = 500;
    state.buildings.altar = 1;
    state.books = undefined; // No book_of_ascension - base 1 totem

    const result = applyActionEffects("craftBoneTotems", state);
    const gained = result.resources?.bone_totem ?? 0;
    // Base 1 totem × Prior 3 = 3 totems
    expect(gained).toBe(3);
  });

  it("craftTorches NOT assigned to Prior is unaffected by Prior level", () => {
    const state = priorState(4, ["chopWood"]);
    state.resources.wood = 100;
    state.story.seen.hasWood = true;
    state.books = undefined; // No book - base 1 torch

    const result = applyActionEffects("craftTorches", state);
    const gained = result.resources?.torch ?? 0;
    // Should stay at base 1 torch
    expect(gained).toBe(1);
  });

  it("hunt assigned to Prior at level 2 applies ×2 to food fur bones random ranges", () => {
    const state = priorState(2, ["hunt"]);
    state.resources.food = 0;
    state.resources.fur = 0;
    state.resources.bones = 0;
    state.flags.forestUnlocked = true;
    (state as any).BTP = 0;

    const result = applyActionEffects("hunt", state);
    // food random(6,12)×2 → 12–24; fur/bones random(2,5)×2 → 4–10
    expect(result.resources?.food).toBeGreaterThanOrEqual(12);
    expect(result.resources?.food).toBeLessThanOrEqual(24);
    expect(result.resources?.fur).toBeGreaterThanOrEqual(4);
    expect(result.resources?.fur).toBeLessThanOrEqual(10);
    expect(result.resources?.bones).toBeGreaterThanOrEqual(4);
    expect(result.resources?.bones).toBeLessThanOrEqual(10);
  });

  it("craftEmberBomb assigned to Prior at level 2 yields 2× bombs (base 1 → 2)", () => {
    const state = priorState(2, ["craftEmberBomb"]);
    state.resources.iron = 200;
    state.resources.black_powder = 100;
    state.buildings.alchemistHall = 1;
    (state as any).story = { seen: { portalDiscovered: true } };

    const result = applyActionEffects("craftEmberBomb", state);
    const gained = result.resources?.ember_bomb ?? 0;
    // Base 1 bomb × Prior 2 = 2 bombs
    expect(gained).toBe(2);
  });

  it("exploreCave assigned to Prior at level 4 stays within scaled stone random range (×3)", () => {
    const state = priorState(4, ["exploreCave"]);
    state.resources.stone = 0;
    state.story.seen.hasWood = true;
    (state as any).tools = {};

    const result = applyActionEffects("exploreCave", state);
    // stone random(3,7)×3 → 9–21
    const stone = result.resources?.stone ?? 0;
    expect(stone).toBeGreaterThanOrEqual(9);
    expect(stone).toBeLessThanOrEqual(21);
  });
});
