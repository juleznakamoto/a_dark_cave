
import { describe, it, expect, beforeEach } from 'vitest';
import { applyActionEffects, setGameActionsRef } from './actionEffects';
import { gameActions } from './index';
import { GameState } from '@shared/schema';
import { createInitialState } from '../state';

describe('actionEffects - circular dependency fix', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState();
    // Ensure gameActions is registered
    setGameActionsRef(gameActions);
  });

  it('should successfully import and use applyActionEffects', () => {
    expect(applyActionEffects).toBeDefined();
    expect(typeof applyActionEffects).toBe('function');
  });

  it('should apply effects for craftBoneTotem action', () => {
    // Set up state to have required resources
    state.resources.bones = 100;
    state.buildings.altar = 1;
    state.buildings.shrine = 0;

    const updates = applyActionEffects('craftBoneTotem', state);

    expect(updates).toBeDefined();
    expect(updates.resources).toBeDefined();
    expect(updates.resources!.bones).toBe(0); // 100 - 100 cost
    expect(updates.resources!.bone_totem).toBe(1);
  });

  it('should apply effects for craftTorch action', () => {
    state.resources.wood = 20;
    state.story.seen.hasWood = true;
    state.tools.stone_axe = false;

    const updates = applyActionEffects('craftTorch', state);

    expect(updates).toBeDefined();
    expect(updates.resources).toBeDefined();
    expect(updates.resources!.wood).toBe(10); // 20 - 10 cost
    expect(updates.resources!.torch).toBeGreaterThanOrEqual(1);
  });

  it('should apply effects for craftIronSword action', () => {
    state.resources.iron = 150;
    state.buildings.blacksmith = 1;
    state.weapons.iron_sword = false;

    const updates = applyActionEffects('craftIronSword', state);

    expect(updates).toBeDefined();
    expect(updates.resources).toBeDefined();
    expect(updates.resources!.iron).toBe(0); // 150 - 150 cost
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
    testState.resources.wood = 100;
    const result = applyActionEffects('chopWood', testState);
    expect(result).toBeDefined();
  });
});

describe('Crafting Cost Reductions', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState();
    setGameActionsRef(gameActions);
  });

  it('should apply blacksmith_hammer 15% crafting discount', () => {
    // Without hammer
    state.resources.iron = 150;
    state.buildings.blacksmith = 1;
    state.tools.blacksmith_hammer = false;

    const updatesWithout = applyActionEffects('craftIronSword', state);
    expect(updatesWithout.resources!.iron).toBe(0); // 150 - 150 = 0

    // With hammer (15% discount)
    state.resources.iron = 150;
    state.tools.blacksmith_hammer = true;

    const updatesWith = applyActionEffects('craftIronSword', state);
    const expectedCost = Math.floor(150 * 0.85); // 127
    expect(updatesWith.resources!.iron).toBe(150 - expectedCost); // 150 - 127 = 23
  });

  it('should apply storehouse 5% crafting discount', () => {
    // Without storehouse
    state.resources.iron = 150;
    state.buildings.blacksmith = 1;
    state.buildings.storehouse = 0;

    const updatesWithout = applyActionEffects('craftIronSword', state);
    expect(updatesWithout.resources!.iron).toBe(0); // 150 - 150 = 0

    // With storehouse (5% discount)
    state.resources.iron = 150;
    state.buildings.storehouse = 1;

    const updatesWith = applyActionEffects('craftIronSword', state);
    const expectedCost = Math.floor(150 * 0.95); // 142
    expect(updatesWith.resources!.iron).toBe(150 - expectedCost); // 150 - 142 = 8
  });

  it('should stack crafting discounts from multiple buildings', () => {
    // With both storehouse (5%) and fortified storehouse (5%) and grand repository (10%)
    state.resources.iron = 150;
    state.buildings.blacksmith = 1;
    state.buildings.storehouse = 1;
    state.buildings.fortifiedStorehouse = 1;
    state.buildings.grandRepository = 1;

    const updates = applyActionEffects('craftIronSword', state);
    // Total discount: 5% + 5% + 10% = 20%
    const expectedCost = Math.floor(150 * 0.8); // 120
    expect(updates.resources!.iron).toBe(150 - expectedCost); // 150 - 120 = 30
  });

  it('should stack crafting discounts from buildings and tools', () => {
    // With blacksmith_hammer (15%) and storehouse (5%)
    state.resources.iron = 150;
    state.buildings.blacksmith = 1;
    state.tools.blacksmith_hammer = true;
    state.buildings.storehouse = 1;

    const updates = applyActionEffects('craftIronSword', state);
    // Total discount: 15% + 5% = 20%
    const expectedCost = Math.floor(150 * 0.8); // 120
    expect(updates.resources!.iron).toBe(150 - expectedCost); // 150 - 120 = 30
  });
});

describe('Building Cost Reductions', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState();
    setGameActionsRef(gameActions);
  });

  it('should apply mastermason_chisel 10% building discount', () => {
    // Without chisel
    state.resources.wood = 150;
    state.resources.stone = 50;
    state.buildings.woodenHut = 1;
    state.tools.mastermason_chisel = false;

    const updatesWithout = applyActionEffects('buildCabin', state);
    expect(updatesWithout.resources!.wood).toBe(0); // 150 - 150 = 0
    expect(updatesWithout.resources!.stone).toBe(0); // 50 - 50 = 0

    // With chisel (10% discount)
    state.resources.wood = 150;
    state.resources.stone = 50;
    state.tools.mastermason_chisel = true;

    const updatesWith = applyActionEffects('buildCabin', state);
    const expectedWoodCost = Math.floor(150 * 0.9); // 135
    const expectedStoneCost = Math.floor(50 * 0.9); // 45
    expect(updatesWith.resources!.wood).toBe(150 - expectedWoodCost); // 150 - 135 = 15
    expect(updatesWith.resources!.stone).toBe(50 - expectedStoneCost); // 50 - 45 = 5
  });

  it('should apply fortified storehouse 5% building discount', () => {
    // Without fortified storehouse
    state.resources.wood = 150;
    state.resources.stone = 50;
    state.buildings.woodenHut = 1;
    state.buildings.fortifiedStorehouse = 0;

    const updatesWithout = applyActionEffects('buildCabin', state);
    expect(updatesWithout.resources!.wood).toBe(0); // 150 - 150 = 0

    // With fortified storehouse (5% discount)
    state.resources.wood = 150;
    state.resources.stone = 50;
    state.buildings.fortifiedStorehouse = 1;

    const updatesWith = applyActionEffects('buildCabin', state);
    const expectedWoodCost = Math.floor(150 * 0.95); // 142
    const expectedStoneCost = Math.floor(50 * 0.95); // 47
    expect(updatesWith.resources!.wood).toBe(150 - expectedWoodCost); // 150 - 142 = 8
    expect(updatesWith.resources!.stone).toBe(50 - expectedStoneCost); // 50 - 47 = 3
  });

  it('should stack building discounts from multiple buildings', () => {
    // With fortified storehouse (5%), village warehouse (5%), grand repository (5%), and city vault (10%)
    state.resources.wood = 150;
    state.resources.stone = 50;
    state.buildings.woodenHut = 1;
    state.buildings.fortifiedStorehouse = 1;
    state.buildings.villageWarehouse = 1;
    state.buildings.grandRepository = 1;
    state.buildings.cityVault = 1;

    const updates = applyActionEffects('buildCabin', state);
    // Total discount: 5% + 5% + 5% + 10% = 25%
    const expectedWoodCost = Math.floor(150 * 0.75); // 112
    const expectedStoneCost = Math.floor(50 * 0.75); // 37
    expect(updates.resources!.wood).toBe(150 - expectedWoodCost); // 150 - 112 = 38
    expect(updates.resources!.stone).toBe(50 - expectedStoneCost); // 50 - 37 = 13
  });

  it('should stack building discounts from buildings and tools', () => {
    // With mastermason_chisel (10%) and fortified storehouse (5%)
    state.resources.wood = 150;
    state.resources.stone = 50;
    state.buildings.woodenHut = 1;
    state.tools.mastermason_chisel = true;
    state.buildings.fortifiedStorehouse = 1;

    const updates = applyActionEffects('buildCabin', state);
    // Total discount: 10% + 5% = 15%
    const expectedWoodCost = Math.floor(150 * 0.85); // 127
    const expectedStoneCost = Math.floor(50 * 0.85); // 42
    expect(updates.resources!.wood).toBe(150 - expectedWoodCost); // 150 - 127 = 23
    expect(updates.resources!.stone).toBe(50 - expectedStoneCost); // 50 - 42 = 8
  });

  it('should apply discounts to multi-tier building costs', () => {
    // Test wooden hut at different levels with discounts
    state.resources.wood = 100;
    state.buildings.woodenHut = 1;
    state.buildings.blacksmith = 1;
    state.tools.mastermason_chisel = true;

    const updates = applyActionEffects('buildWoodenHut', state);
    // Level 2 costs 100 wood, with 10% discount = 90 wood
    const expectedCost = Math.floor(100 * 0.9); // 90
    expect(updates.resources!.wood).toBe(100 - expectedCost); // 100 - 90 = 10
  });
});

describe('Cost Reduction Edge Cases', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState();
    setGameActionsRef(gameActions);
  });

  it('should handle crafting with maximum discounts', () => {
    // Maximum crafting discount scenario
    state.resources.iron = 150;
    state.buildings.blacksmith = 1;
    state.tools.blacksmith_hammer = true; // 15%
    state.buildings.storehouse = 1; // 5%
    state.buildings.fortifiedStorehouse = 1; // 5%
    state.buildings.villageWarehouse = 1; // 5%
    state.buildings.grandRepository = 1; // 10%
    state.buildings.cityVault = 1; // 10%

    const updates = applyActionEffects('craftIronSword', state);
    // Total discount: 15% + 5% + 5% + 5% + 10% + 10% = 50%
    const expectedCost = Math.floor(150 * 0.5); // 75
    expect(updates.resources!.iron).toBe(150 - expectedCost); // 150 - 75 = 75
  });

  it('should handle building with maximum discounts', () => {
    // Maximum building discount scenario
    state.resources.wood = 150;
    state.resources.stone = 50;
    state.buildings.woodenHut = 1;
    state.tools.mastermason_chisel = true; // 10%
    state.buildings.fortifiedStorehouse = 1; // 5%
    state.buildings.villageWarehouse = 1; // 5%
    state.buildings.grandRepository = 1; // 5%
    state.buildings.cityVault = 1; // 10%

    const updates = applyActionEffects('buildCabin', state);
    // Total discount: 10% + 5% + 5% + 5% + 10% = 35%
    const expectedWoodCost = Math.floor(150 * 0.65); // 97
    const expectedStoneCost = Math.floor(50 * 0.65); // 32
    expect(updates.resources!.wood).toBe(150 - expectedWoodCost); // 150 - 97 = 53
    expect(updates.resources!.stone).toBe(50 - expectedStoneCost); // 50 - 32 = 18
  });

  it('should not apply discounts to non-crafting, non-building actions', () => {
    // Test that chopWood doesn't get discounts
    state.resources.wood = 0;
    state.tools.blacksmith_hammer = true;
    state.buildings.storehouse = 1;

    const updates = applyActionEffects('chopWood', state);
    // chopWood should give resources, not consume them with discount
    expect(updates.resources!.wood).toBeGreaterThan(0);
  });

  it('should floor discount calculations correctly', () => {
    // Test that partial costs are floored
    state.resources.iron = 100;
    state.buildings.blacksmith = 1;
    state.buildings.storehouse = 1; // 5% discount

    // Create a scenario where 5% would give a decimal
    const action = gameActions['craftIronSword'];
    const originalCost = 150;
    
    state.resources.iron = originalCost;
    const updates = applyActionEffects('craftIronSword', state);
    
    // 150 * 0.95 = 142.5, should floor to 142
    const expectedCost = Math.floor(originalCost * 0.95);
    expect(updates.resources!.iron).toBe(originalCost - expectedCost);
  });
});
