import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '@shared/schema';
import { createInitialState } from '../state';

// Import index first to ensure gameActions is initialized
import { gameActions } from './index';
import { applyActionEffects } from './actionEffects';
import { getTotalCraftingCostReduction, getTotalBuildingCostReduction } from './effectsCalculation';

describe('actionEffects - circular dependency fix', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState();
  });

  it('should successfully import and use applyActionEffects', () => {
    expect(applyActionEffects).toBeDefined();
    expect(typeof applyActionEffects).toBe('function');
  });

  it('should apply effects for craftBoneTotem action', () => {
    // Set up state to have required resources
    const boneCost = (gameActions.craftBoneTotem.cost as any)["resources.bones"];
    state.resources.bones = boneCost;
    state.buildings.altar = 1;
    state.buildings.shrine = 0;

    const updates = applyActionEffects('craftBoneTotem', state);

    expect(updates).toBeDefined();
    expect(updates.resources).toBeDefined();
    expect(updates.resources!.bones).toBe(0); // boneCost - boneCost
    expect(updates.resources!.bone_totem).toBe(1);
  });

  it('should apply effects for craftTorch action', () => {
    const woodCost = (gameActions.craftTorch.cost as any)["resources.wood"];
    state.resources.wood = woodCost * 2; // Ensure enough resources
    state.story.seen.hasWood = true;
    state.tools.stone_axe = false;

    const updates = applyActionEffects('craftTorch', state);

    expect(updates).toBeDefined();
    expect(updates.resources).toBeDefined();
    expect(updates.resources!.wood).toBe(woodCost); // woodCost * 2 - woodCost
    expect(updates.resources!.torch).toBeGreaterThanOrEqual(1);
  });

  it('should apply effects for craftIronSword action', () => {
    const ironCost = (gameActions.craftIronSword.cost as any)["resources.iron"];
    state.resources.iron = ironCost;
    state.buildings.blacksmith = 1;
    state.weapons.iron_sword = false;

    const updates = applyActionEffects('craftIronSword', state);

    expect(updates).toBeDefined();
    expect(updates.resources).toBeDefined();
    expect(updates.resources!.iron).toBe(0); // ironCost - ironCost
    expect(updates.weapons).toBeDefined();
    expect(updates.weapons!.iron_sword).toBe(true);
  });

  it('should handle action that does not exist', () => {
    const updates = applyActionEffects('nonExistentAction', state);

    expect(updates).toEqual({});
  });

  it('should work with gameActions registered', () => {
    // Verify the function works after registration
    expect(applyActionEffects).toBeDefined();
    expect(typeof applyActionEffects).toBe('function');

    // Verify it can actually apply effects
    const testState = createInitialState();
    testState.resources.wood = 0; // Start with 0 wood
    const result = applyActionEffects('chopWood', testState);
    expect(result).toBeDefined();
    expect(result.resources!.wood).toBeGreaterThan(0); // Should gain wood
  });
});

describe('Crafting Cost Reductions', () => {
  let state: GameState;
  const baseState = createInitialState();

  beforeEach(() => {
    state = createInitialState();
  });

  it('should apply blacksmith_hammer 10% crafting discount for craftIronAxe', () => {
    const baseCost = 50; // craftIronAxe base cost

    const stateWith: GameState = {
      ...baseState,
      buildings: { blacksmith: 1 },
      tools: { stone_pickaxe: true, blacksmith_hammer: true },
      resources: { iron: baseCost },
    };

    const updatesWith = applyActionEffects("craftIronAxe", stateWith);

    // With 10% discount from blacksmith_hammer: cost = floor(50 * 0.90) = 45
    const expectedCost = Math.floor(baseCost * 0.90);
    const expectedRemaining = baseCost - expectedCost;
    expect(updatesWith.resources!.iron).toBe(expectedRemaining);
  });

  it('should stack crafting discounts from tools and highest storage building for craftIronAxe', () => {
    const baseCost = (gameActions.craftIronAxe.cost as any)["resources.iron"];

    const state: GameState = {
      ...baseState,
      buildings: {
        blacksmith: 1,
        storehouse: 1,
        fortifiedStorehouse: 1,
        greatVault: 1, // 5% discount (should apply)
      },
      tools: {
        stone_pickaxe: true,
        blacksmith_hammer: true // 10% crafting discount
      },
      resources: { iron: baseCost },
    };

    const updates = applyActionEffects("craftIronAxe", state);

    // blacksmith_hammer: 10%
    // Great Vault: 5% (highest storage building)
    // Total: 15%
    const totalDiscount = getTotalCraftingCostReduction(state);
    const expectedCost = Math.floor(baseCost * (1 - totalDiscount));
    const expectedRemaining = baseCost - expectedCost;
    expect(updates.resources!.iron).toBe(expectedRemaining);
  });

  it('should handle crafting with maximum discounts for craftIronAxe', () => {
    const baseCost = (gameActions.craftIronAxe.cost as any)["resources.iron"];

    const state: GameState = {
      ...baseState,
      buildings: {
        blacksmith: 1,
        storehouse: 1,
        fortifiedStorehouse: 1,
        greatVault: 1, // 10% discount (highest)
      },
      tools: {
        stone_pickaxe: true,
        blacksmith_hammer: true // 10% crafting discount
      },
      resources: { iron: baseCost },
    };

    const updates = applyActionEffects("craftIronAxe", state);

    // blacksmith_hammer: 10%
    // Great Vault: 10%
    // Total: 20%
    const totalDiscount = getTotalCraftingCostReduction(state);
    const expectedCost = Math.floor(baseCost * (1 - totalDiscount));
    const expectedRemaining = baseCost - expectedCost;
    expect(updates.resources!.iron).toBe(expectedRemaining);
    // Note: Only highest tier storage building discount applies (10% from greatVault)
  });
});

describe('Building Cost Reductions', () => {
  let state: GameState;
  const baseState = createInitialState();

  beforeEach(() => {
    state = createInitialState();
  });

  it('should apply mastermason_chisel 10% building discount for buildCabin', () => {
    const baseWoodCost = 150;
    const baseStoneCost = 50;

    const stateWith: GameState = {
      ...baseState,
      buildings: {},
      tools: { mastermason_chisel: true },
      resources: { wood: baseWoodCost, stone: baseStoneCost },
    };

    const updatesWith = applyActionEffects("buildCabin", stateWith);

    // With 10% discount: wood = floor(150 * 0.9) = 135, stone = floor(50 * 0.9) = 45
    const expectedWoodCost = Math.floor(baseWoodCost * 0.9);
    const expectedStoneCost = Math.floor(baseStoneCost * 0.9);
    expect(updatesWith.resources!.wood).toBe(baseWoodCost - expectedWoodCost);
    expect(updatesWith.resources!.stone).toBe(baseStoneCost - expectedStoneCost);
  });

  it('should apply fortified storehouse 5% building discount for buildCabin', () => {
    const baseWoodCost = (gameActions.buildCabin.cost as any)[1]["resources.wood"];
    const baseStoneCost = (gameActions.buildCabin.cost as any)[1]["resources.stone"];

    state.resources.wood = baseWoodCost;
    state.resources.stone = baseStoneCost;
    state.buildings.fortifiedStorehouse = 1;

    const updatesWith = applyActionEffects('buildCabin', state);
    const expectedWoodCost = Math.floor(baseWoodCost * 0.95); // 142
    const expectedStoneCost = Math.floor(baseStoneCost * 0.95); // 47
    expect(updatesWith.resources!.wood).toBe(baseWoodCost - expectedWoodCost); // 150 - 142 = 8
    expect(updatesWith.resources!.stone).toBe(baseStoneCost - expectedStoneCost); // 50 - 47 = 3
  });

  it('should use only highest tier storage building for building cost reduction for buildCabin', () => {
    const baseWoodCost = (gameActions.buildCabin.cost as any)[1]["resources.wood"];
    const baseStoneCost = (gameActions.buildCabin.cost as any)[1]["resources.stone"];

    state.resources.wood = baseWoodCost;
    state.resources.stone = baseStoneCost;
    state.buildings.fortifiedStorehouse = 1;
    state.buildings.villageWarehouse = 1;
    state.buildings.grandRepository = 1;
    state.buildings.greatVault = 1; // 10% discount (should apply)

    const updates = applyActionEffects('buildCabin', state);
    // Only highest tier discount: 10% from greatVault
    const expectedWoodCost = Math.floor(baseWoodCost * 0.9); // 135
    const expectedStoneCost = Math.floor(baseStoneCost * 0.9); // 45
    expect(updates.resources!.wood).toBe(baseWoodCost - expectedWoodCost); // 150 - 135 = 15
    expect(updates.resources!.stone).toBe(baseStoneCost - expectedStoneCost); // 50 - 45 = 5
  });

  it('should stack building discounts from buildings and tools for buildCabin', () => {
    const baseWoodCost = (gameActions.buildCabin.cost as any)[1]["resources.wood"];
    const baseStoneCost = (gameActions.buildCabin.cost as any)[1]["resources.stone"];

    const state: GameState = {
      ...baseState,
      buildings: {
        storehouse: 1,
        fortifiedStorehouse: 1, // 5% discount
        greatVault: 1, // 10% discount (should apply)
      },
      tools: {
        mastermason_chisel: true // 10% building discount
      },
      resources: { wood: baseWoodCost, stone: baseStoneCost },
    };

    const updates = applyActionEffects("buildCabin", state);

    // mastermason_chisel: 10%
    // Great Vault: 10% (highest storage building)
    // Total: 20%
    const totalDiscount = getTotalBuildingCostReduction(state);
    const expectedWoodCost = Math.floor(baseWoodCost * (1 - totalDiscount));
    const expectedStoneCost = Math.floor(baseStoneCost * (1 - totalDiscount));
    expect(updates.resources!.wood).toBe(baseWoodCost - expectedWoodCost);
    expect(updates.resources!.stone).toBe(baseStoneCost - expectedStoneCost);
  });

  it('should apply discounts to building with existing cabins', () => {
    // buildCabin level 2 costs 300 wood, 100 stone
    const baseWoodCost = 300;
    const baseStoneCost = 100;

    const state: GameState = {
      ...baseState,
      buildings: { cabin: 1 }, // Has 1 cabin already, building level 2
      tools: { mastermason_chisel: true },
      resources: { wood: baseWoodCost, stone: baseStoneCost },
    };

    const updates = applyActionEffects("buildCabin", state);

    // Level 2 with 10% discount
    const expectedWoodCost = Math.floor(baseWoodCost * 0.9);
    const expectedStoneCost = Math.floor(baseStoneCost * 0.9);
    expect(updates.resources!.wood).toBe(baseWoodCost - expectedWoodCost);
    expect(updates.resources!.stone).toBe(baseStoneCost - expectedStoneCost);
  });
});

describe('Cost Reduction Edge Cases', () => {
  let state: GameState;
  const baseState = createInitialState();

  beforeEach(() => {
    state = createInitialState();
  });

  it('should handle crafting with maximum discounts for craftIronAxe', () => {
    const baseCost = (gameActions.craftIronAxe.cost as any)["resources.iron"];

    const state: GameState = {
      ...baseState,
      buildings: {
        blacksmith: 1,
        storehouse: 1,
        fortifiedStorehouse: 1,
        greatVault: 1, // 10% discount (highest)
      },
      tools: {
        stone_pickaxe: true,
        blacksmith_hammer: true // 10% crafting discount
      },
      resources: { iron: baseCost },
    };

    const updates = applyActionEffects("craftIronAxe", state);

    // blacksmith_hammer: 10%
    // Great Vault: 10%
    // Total: 20%
    const totalDiscount = getTotalCraftingCostReduction(state);
    const expectedCost = Math.floor(baseCost * (1 - totalDiscount));
    const expectedRemaining = baseCost - expectedCost;
    expect(updates.resources!.iron).toBe(expectedRemaining);
    // Note: Only highest tier storage building discount applies (10% from greatVault)
  });

  it('should handle building with maximum discounts for buildCabin', () => {
    const baseWoodCost = (gameActions.buildCabin.cost as any)[1]["resources.wood"];
    const baseStoneCost = (gameActions.buildCabin.cost as any)[1]["resources.stone"];

    const state: GameState = {
      ...baseState,
      buildings: {
        storehouse: 1,
        fortifiedStorehouse: 1,
        greatVault: 1, // 10% discount (highest)
      },
      tools: {
        mastermason_chisel: true // 10% building discount
      },
      resources: { wood: baseWoodCost, stone: baseStoneCost },
    };

    const updates = applyActionEffects("buildCabin", state);

    // mastermason_chisel: 10%
    // Great Vault: 10%
    // Total: 20%
    const totalDiscount = getTotalBuildingCostReduction(state);
    const expectedWoodCost = Math.floor(baseWoodCost * (1 - totalDiscount));
    const expectedStoneCost = Math.floor(baseStoneCost * (1 - totalDiscount));
    expect(updates.resources!.wood).toBe(baseWoodCost - expectedWoodCost);
    expect(updates.resources!.stone).toBe(baseStoneCost - expectedStoneCost);
    // Note: Previously was 35% (stacking all), now 20% (only highest tier storage building)
  });

  it('should not apply discounts to non-crafting, non-building actions', () => {
    // Test that chopWood doesn't get discounts (it gives resources, not consumes them)
    state.resources.wood = 0;
    state.tools.blacksmith_hammer = true;
    state.buildings.storehouse = 1;

    const updates = applyActionEffects('chopWood', state);
    // chopWood should give resources (random 1-4 wood), not consume them
    expect(updates.resources!.wood).toBeGreaterThan(0);
    expect(updates.resources!.wood).toBeLessThanOrEqual(4);
  });

  it('should floor discount calculations correctly for crafting', () => {
    // Test that partial costs are floored
    const baseIronCost = (gameActions.craftIronSword.cost as any)["resources.iron"];

    state.resources.iron = baseIronCost;
    state.buildings.blacksmith = 1;
    state.buildings.fortifiedStorehouse = 1; // 5% discount

    const updates = applyActionEffects('craftIronSword', state);

    // 150 * 0.95 = 142.5, should floor to 142
    const expectedCost = Math.floor(baseIronCost * 0.95);
    expect(updates.resources!.iron).toBe(baseIronCost - expectedCost);
  });

  it('should floor discount calculations correctly for building', () => {
    const baseWoodCost = (gameActions.buildCabin.cost as any)[1]["resources.wood"];
    const baseStoneCost = (gameActions.buildCabin.cost as any)[1]["resources.stone"];

    state.resources.wood = baseWoodCost;
    state.resources.stone = baseStoneCost;
    state.buildings.woodenHut = 1; // Assume this building grants a discount
    state.buildings.fortifiedStorehouse = 1; // 5% discount

    const updates = applyActionEffects('buildCabin', state);

    // Assume a scenario where 5% would give a decimal
    const expectedWoodCost = Math.floor(baseWoodCost * 0.95);
    const expectedStoneCost = Math.floor(baseStoneCost * 0.95);
    expect(updates.resources!.wood).toBe(baseWoodCost - expectedWoodCost);
    expect(updates.resources!.stone).toBe(baseStoneCost - expectedStoneCost);
  });
});

// Helper functions (assuming these are defined elsewhere and needed for context)
declare function getTotalCraftingCostReduction(state: GameState): number;
declare function getTotalBuildingCostReduction(state: GameState): number;