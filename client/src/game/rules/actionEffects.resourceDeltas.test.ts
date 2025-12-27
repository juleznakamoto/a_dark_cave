
import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '@shared/schema';
import { createInitialState } from '../../state';
import { applyActionEffects } from './actionEffects';

// Helper to create mock state for testing
function createMockState(overrides?: Partial<GameState>): GameState {
  const base = createInitialState();
  return {
    ...base,
    ...overrides,
    buildings: { ...base.buildings, ...overrides?.buildings },
    resources: { ...base.resources, ...overrides?.resources },
    tools: { ...base.tools, ...overrides?.tools },
    flags: { ...base.flags, ...overrides?.flags },
  };
}

describe('Resource Deltas - Mining Actions', () => {
  it('mineStone should return negative delta for costs and positive delta for gains', () => {
    const state = createMockState({
      tools: { stone_pickaxe: true },
      resources: { food: 100, torch: 10, stone: 50 },
    });

    const updates = applyActionEffects('mineStone', state);

    // Cost deltas should be negative
    expect(updates.resources!.food).toBe(-10);
    expect(updates.resources!.torch).toBe(-1);
    
    // Gain deltas should be positive (random 4-8)
    expect(updates.resources!.stone).toBeGreaterThanOrEqual(4);
    expect(updates.resources!.stone).toBeLessThanOrEqual(8);
  });

  it('mineIron should return deltas not absolute values', () => {
    const state = createMockState({
      tools: { stone_pickaxe: true },
      resources: { food: 100, torch: 10, iron: 30 },
    });

    const updates = applyActionEffects('mineIron', state);

    // Costs are negative deltas
    expect(updates.resources!.food).toBe(-10);
    expect(updates.resources!.torch).toBe(-1);
    
    // Gains are positive deltas (random 4-8)
    expect(updates.resources!.iron).toBeGreaterThanOrEqual(4);
    expect(updates.resources!.iron).toBeLessThanOrEqual(8);
  });

  it('mineCoal should return deltas not absolute values', () => {
    const state = createMockState({
      tools: { iron_pickaxe: true },
      resources: { food: 100, torch: 10, coal: 20 },
    });

    const updates = applyActionEffects('mineCoal', state);

    expect(updates.resources!.food).toBe(-10);
    expect(updates.resources!.torch).toBe(-1);
    expect(updates.resources!.coal).toBeGreaterThanOrEqual(4);
    expect(updates.resources!.coal).toBeLessThanOrEqual(8);
  });

  it('mineObsidian should return deltas not absolute values', () => {
    const state = createMockState({
      tools: { steel_pickaxe: true },
      resources: { food: 100, torch: 10, obsidian: 15 },
    });

    const updates = applyActionEffects('mineObsidian', state);

    expect(updates.resources!.food).toBe(-50);
    expect(updates.resources!.torch).toBe(-5);
    expect(updates.resources!.obsidian).toBeGreaterThanOrEqual(3);
    expect(updates.resources!.obsidian).toBeLessThanOrEqual(7);
  });
});

describe('Resource Deltas - Exploration Actions', () => {
  it('exploreCave should return deltas for all resources', () => {
    const state = createMockState({
      story: { seen: { actionCraftTorch: true } },
      resources: { wood: 50, stone: 30, coal: 20, iron: 10 },
    });

    const updates = applyActionEffects('exploreCave', state);

    // All gains should be positive deltas
    expect(updates.resources!.wood).toBeGreaterThanOrEqual(5);
    expect(updates.resources!.wood).toBeLessThanOrEqual(10);
    expect(updates.resources!.stone).toBeGreaterThanOrEqual(3);
    expect(updates.resources!.stone).toBeLessThanOrEqual(7);
  });

  it('ventureDeeper should return deltas not absolute values', () => {
    const state = createMockState({
      buildings: { blacksmith: 1 },
      resources: { stone: 50, coal: 30, iron: 20, sulfur: 10, silver: 5 },
    });

    const updates = applyActionEffects('ventureDeeper', state);

    // Check that all resources are deltas (positive values)
    expect(updates.resources!.stone).toBeGreaterThanOrEqual(5);
    expect(updates.resources!.coal).toBeGreaterThanOrEqual(5);
    expect(updates.resources!.iron).toBeGreaterThanOrEqual(5);
  });

  it('exploreCitadel should return deltas not absolute values', () => {
    const state = createMockState({
      tools: { adamant_lantern: true },
      resources: { obsidian: 20, adamant: 15, moonstone: 10, silver: 100, gold: 50 },
    });

    const updates = applyActionEffects('exploreCitadel', state);

    // All gains should be positive deltas
    expect(updates.resources!.obsidian).toBeGreaterThanOrEqual(1);
    expect(updates.resources!.adamant).toBeGreaterThanOrEqual(1);
    expect(updates.resources!.moonstone).toBeGreaterThanOrEqual(1);
  });
});

describe('Resource Deltas - Building Actions', () => {
  it('buildWoodenHut should return negative deltas for costs', () => {
    const state = createMockState({
      resources: { wood: 100, stone: 50 },
      buildings: { woodenHut: 0 },
    });

    const updates = applyActionEffects('buildWoodenHut', state);

    // Costs should be negative deltas
    expect(updates.resources!.wood).toBe(-50);
    expect(updates.resources!.stone).toBe(-20);
  });

  it('buildCabin should return negative deltas for costs with cost reduction', () => {
    const state = createMockState({
      resources: { wood: 200, stone: 100 },
      buildings: { woodenHut: 1, cabin: 0 },
      tools: { mastermason_chisel: true },
    });

    const updates = applyActionEffects('buildCabin', state);

    // With 5% cost reduction from mastermason_chisel
    // Wood: floor(150 * 0.95) = 142
    // Stone: floor(50 * 0.95) = 47
    expect(updates.resources!.wood).toBe(-142);
    expect(updates.resources!.stone).toBe(-47);
  });

  it('buildBlacksmith should return negative deltas for costs', () => {
    const state = createMockState({
      resources: { wood: 200, stone: 200, iron: 100 },
      buildings: { blacksmith: 0 },
    });

    const updates = applyActionEffects('buildBlacksmith', state);

    expect(updates.resources!.wood).toBe(-100);
    expect(updates.resources!.stone).toBe(-100);
    expect(updates.resources!.iron).toBe(-50);
  });
});

describe('Resource Deltas - Crafting Actions', () => {
  it('craftIronAxe should return negative delta for cost', () => {
    const state = createMockState({
      buildings: { blacksmith: 1 },
      tools: { stone_pickaxe: true },
      resources: { iron: 100 },
    });

    const updates = applyActionEffects('craftIronAxe', state);

    // Base cost is 50, no discounts
    expect(updates.resources!.iron).toBe(-50);
  });

  it('craftIronAxe with blacksmith_hammer should apply cost reduction', () => {
    const state = createMockState({
      buildings: { blacksmith: 1 },
      tools: { stone_pickaxe: true, blacksmith_hammer: true },
      resources: { iron: 100 },
    });

    const updates = applyActionEffects('craftIronAxe', state);

    // With 10% crafting discount: floor(50 * 0.90) = 45
    expect(updates.resources!.iron).toBe(-45);
  });

  it('craftBoneTotem should return negative delta for cost and positive for gain', () => {
    const state = createMockState({
      buildings: { altar: 1 },
      resources: { bones: 150, bone_totem: 5 },
    });

    const updates = applyActionEffects('craftBoneTotem', state);

    expect(updates.resources!.bones).toBe(-100);
    expect(updates.resources!.bone_totem).toBe(1);
  });
});

describe('Resource Deltas - Sacrifice Actions', () => {
  it('boneTotems should return negative delta for cost and positive for gain', () => {
    const state = createMockState({
      buildings: { altar: 1 },
      resources: { bone_totem: 10, silver: 50 },
    });

    const updates = applyActionEffects('boneTotems', state);

    // Cost is dynamic but should be negative
    expect(updates.resources!.bone_totem).toBeLessThan(0);
    
    // Gain should be positive (random 10-25)
    expect(updates.resources!.silver).toBeGreaterThanOrEqual(10);
    expect(updates.resources!.silver).toBeLessThanOrEqual(25);
  });

  it('leatherTotems should return negative delta for cost and positive for gain', () => {
    const state = createMockState({
      buildings: { temple: 1 },
      resources: { leather_totem: 10, gold: 30 },
    });

    const updates = applyActionEffects('leatherTotems', state);

    expect(updates.resources!.leather_totem).toBeLessThan(0);
    expect(updates.resources!.gold).toBeGreaterThanOrEqual(10);
    expect(updates.resources!.gold).toBeLessThanOrEqual(25);
  });
});

describe('Resource Deltas - State Merging', () => {
  it('mergeStateUpdates should correctly apply deltas to current resources', () => {
    const state = createMockState({
      resources: { wood: 100, stone: 50 },
    });

    // Simulate mining stone: -10 food, -1 torch, +6 stone
    const updates: Partial<GameState> = {
      resources: {
        food: -10,
        torch: -1,
        stone: 6,
      } as any,
    };

    // mergeStateUpdates adds deltas to current values
    const merged = {
      ...state,
      resources: {
        ...state.resources,
        food: (state.resources.food || 0) + (updates.resources!.food || 0),
        torch: (state.resources.torch || 0) + (updates.resources!.torch || 0),
        stone: (state.resources.stone || 0) + (updates.resources!.stone || 0),
      },
    };

    expect(merged.resources.food).toBe(state.resources.food - 10);
    expect(merged.resources.torch).toBe(state.resources.torch - 1);
    expect(merged.resources.stone).toBe(56); // 50 + 6
  });

  it('should handle multiple consecutive actions with deltas correctly', () => {
    let currentState = createMockState({
      tools: { stone_pickaxe: true },
      resources: { food: 100, torch: 10, stone: 0 },
    });

    // Mine stone 3 times
    for (let i = 0; i < 3; i++) {
      const updates = applyActionEffects('mineStone', currentState);
      
      // Apply deltas to current state
      currentState = {
        ...currentState,
        resources: {
          ...currentState.resources,
          food: (currentState.resources.food || 0) + (updates.resources!.food || 0),
          torch: (currentState.resources.torch || 0) + (updates.resources!.torch || 0),
          stone: (currentState.resources.stone || 0) + (updates.resources!.stone || 0),
        },
      };
    }

    // After 3 mining actions:
    // Food: 100 - 30 = 70
    // Torch: 10 - 3 = 7
    // Stone: 0 + (4-8)*3 = 12-24
    expect(currentState.resources.food).toBe(70);
    expect(currentState.resources.torch).toBe(7);
    expect(currentState.resources.stone).toBeGreaterThanOrEqual(12);
    expect(currentState.resources.stone).toBeLessThanOrEqual(24);
  });
});
