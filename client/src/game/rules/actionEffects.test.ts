
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
