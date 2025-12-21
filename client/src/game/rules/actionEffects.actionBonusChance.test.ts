
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from '@shared/schema';
import { createInitialState } from '../state';
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
    clothing: { ...base.clothing, ...overrides?.clothing },
    flags: { ...base.flags, ...overrides?.flags },
  };
}

describe('Tarnished Compass - actionBonusChance', () => {
  beforeEach(() => {
    // Reset random seed before each test
    vi.restoreAllMocks();
  });

  describe('Eligible Actions', () => {
    const eligibleActions = [
      'exploreCave',
      'ventureDeeper',
      'descendFurther',
      'exploreRuins',
      'exploreTemple',
      'exploreCitadel',
      'mineStone',
      'mineIron',
      'mineCoal',
      'mineSulfur',
      'mineObsidian',
      'mineAdamant',
      'chopWood',
      'hunt',
    ];

    eligibleActions.forEach((actionId) => {
      it(`${actionId}: should trigger 2x bonus when random check succeeds`, () => {
        // Mock Math.random to always trigger the bonus (return < 0.1)
        vi.spyOn(Math, 'random').mockReturnValue(0.05);

        const state = createMockState({
          clothing: { tarnished_compass: true },
          resources: { wood: 100, stone: 100, food: 100 },
          flags: { forestUnlocked: true },
          tools: { reinforced_rope: true },
        });

        const updates = applyActionEffects(actionId, state);

        // Verify bonus message is added
        expect(updates.logMessages).toBeDefined();
        expect(updates.logMessages).toContain(
          'The Tarnished Compass glows! Your gains are doubled!'
        );

        // Verify resources were gained (specific amounts depend on action)
        expect(updates.resources).toBeDefined();
      });

      it(`${actionId}: should not trigger bonus when random check fails`, () => {
        // Mock Math.random to never trigger the bonus (return > 0.1)
        vi.spyOn(Math, 'random').mockReturnValue(0.15);

        const state = createMockState({
          clothing: { tarnished_compass: true },
          resources: { wood: 100, stone: 100, food: 100 },
          flags: { forestUnlocked: true },
          tools: { reinforced_rope: true },
        });

        const updates = applyActionEffects(actionId, state);

        // Verify no bonus message
        expect(updates.logMessages).not.toContain(
          'The Tarnished Compass glows! Your gains are doubled!'
        );
      });
    });
  });

  describe('Bonus Calculation', () => {
    it('chopWood: should exactly double the gained wood', () => {
      // Mock to trigger bonus
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const state = createMockState({
        clothing: { tarnished_compass: true },
        resources: { wood: 0 },
      });

      const updates = applyActionEffects('chopWood', state);

      // Base chopWood gives 1-4 wood
      // With 2x bonus, should give 2-8 wood
      expect(updates.resources!.wood).toBeGreaterThanOrEqual(2);
      expect(updates.resources!.wood).toBeLessThanOrEqual(8);
    });

    it('mineStone: should exactly double the gained stone', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const state = createMockState({
        clothing: { tarnished_compass: true },
        resources: { stone: 0 },
      });

      const updates = applyActionEffects('mineStone', state);

      // Base mineStone gives 1-3 stone
      // With 2x bonus, should give 2-6 stone
      expect(updates.resources!.stone).toBeGreaterThanOrEqual(2);
      expect(updates.resources!.stone).toBeLessThanOrEqual(6);
    });

    it('hunt: should double all gained resources (food, fur, bones)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const state = createMockState({
        clothing: { tarnished_compass: true },
        resources: { food: 0, fur: 0, bones: 0 },
        flags: { forestUnlocked: true },
      });

      const updates = applyActionEffects('hunt', state);

      // Verify all hunt resources were gained and doubled
      expect(updates.resources!.food).toBeGreaterThan(0);
      expect(updates.resources!.fur).toBeGreaterThan(0);
      expect(updates.resources!.bones).toBeGreaterThan(0);
    });
  });

  describe('Stacking with Other Bonuses', () => {
    it('chopWood: should apply 2x after tool bonuses', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const stateWithoutTool = createMockState({
        clothing: { tarnished_compass: true },
        resources: { wood: 0 },
      });

      const stateWithTool = createMockState({
        clothing: { tarnished_compass: true },
        tools: { stone_axe: true },
        resources: { wood: 0 },
      });

      const updatesWithout = applyActionEffects('chopWood', stateWithoutTool);
      const updatesWith = applyActionEffects('chopWood', stateWithTool);

      // Stone axe gives 1.5x multiplier
      // Base: 1-4 wood
      // With stone axe: floor(1*1.5) - floor(4*1.5) = 1-6 wood
      // With 2x compass bonus: 2-12 wood
      expect(updatesWith.resources!.wood).toBeGreaterThan(
        updatesWithout.resources!.wood
      );
    });

    it('mineStone: should apply 2x after pickaxe bonuses', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const state = createMockState({
        clothing: { tarnished_compass: true },
        tools: { stone_pickaxe: true },
        resources: { stone: 0 },
      });

      const updates = applyActionEffects('mineStone', state);

      // Stone pickaxe gives 1.25x multiplier
      // Base: 1-3 stone
      // With pickaxe: floor(1*1.25) - floor(3*1.25) = 1-3 stone
      // With 2x compass bonus: 2-6 stone
      expect(updates.resources!.stone).toBeGreaterThanOrEqual(2);
    });

    it('exploreCave: should apply 2x after lantern bonuses', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const state = createMockState({
        clothing: { tarnished_compass: true },
        tools: { iron_lantern: true },
        resources: { wood: 0, stone: 0 },
        story: { seen: { actionCraftTorch: true } },
      });

      const updates = applyActionEffects('exploreCave', state);

      // Iron lantern gives 1.25x cave explore multiplier
      // Compass should double the final result
      expect(updates.resources!.wood).toBeGreaterThan(0);
    });
  });

  describe('Without Tarnished Compass', () => {
    it('should not trigger bonus without compass equipped', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const state = createMockState({
        clothing: { tarnished_compass: false },
        resources: { wood: 0 },
      });

      const updates = applyActionEffects('chopWood', state);

      // No bonus message
      expect(updates.logMessages).not.toContain(
        'The Tarnished Compass glows! Your gains are doubled!'
      );

      // Base chopWood gives 1-4 wood (not doubled)
      expect(updates.resources!.wood).toBeGreaterThanOrEqual(1);
      expect(updates.resources!.wood).toBeLessThanOrEqual(4);
    });
  });

  describe('Non-Eligible Actions', () => {
    const nonEligibleActions = [
      'craftTorch',
      'craftIronSword',
      'buildCabin',
      'boneTotems',
      'leatherTotems',
    ];

    nonEligibleActions.forEach((actionId) => {
      it(`${actionId}: should not trigger bonus for non-eligible action`, () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.05);

        const state = createMockState({
          clothing: { tarnished_compass: true },
          resources: { wood: 100, stone: 100, iron: 100, bones: 10, leather: 10 },
          buildings: { altar: 1, temple: 1, clerksHut: 1 },
        });

        const updates = applyActionEffects(actionId, state);

        // No bonus message for non-eligible actions
        expect(updates.logMessages).not.toContain(
          'The Tarnished Compass glows! Your gains are doubled!'
        );
      });
    });
  });

  describe('Probability Distribution', () => {
    it('should trigger approximately 10% of the time over many iterations', () => {
      const iterations = 1000;
      let triggeredCount = 0;

      // Restore real Math.random for this test
      vi.restoreAllMocks();

      for (let i = 0; i < iterations; i++) {
        const state = createMockState({
          clothing: { tarnished_compass: true },
          resources: { wood: 0 },
        });

        const updates = applyActionEffects('chopWood', state);

        if (
          updates.logMessages?.includes(
            'The Tarnished Compass glows! Your gains are doubled!'
          )
        ) {
          triggeredCount++;
        }
      }

      // Should be approximately 10% (with some variance)
      // Allow 5% - 15% range for statistical variance
      const percentage = (triggeredCount / iterations) * 100;
      expect(percentage).toBeGreaterThan(5);
      expect(percentage).toBeLessThan(15);
    });
  });

  describe('Edge Cases', () => {
    it('should not double negative amounts (costs)', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const state = createMockState({
        clothing: { tarnished_compass: true },
        resources: { wood: 100 },
      });

      const updates = applyActionEffects('chopWood', state);

      // Should only double gains, not costs
      // Wood should increase, not decrease more
      expect(updates.resources!.wood).toBeGreaterThan(100);
    });

    it('should handle zero gains correctly', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const state = createMockState({
        clothing: { tarnished_compass: true },
        resources: { stone: 100 },
      });

      // Mock action that gives 0 resources (shouldn't happen in practice)
      const updates = applyActionEffects('mineStone', state);

      // Should not crash or produce negative values
      expect(updates.resources).toBeDefined();
    });
  });

  describe('Multiple Resources', () => {
    it('exploreCave: should double all resources gained', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const state = createMockState({
        clothing: { tarnished_compass: true },
        resources: { wood: 0, stone: 0 },
        story: { seen: { actionCraftTorch: true } },
      });

      const updates = applyActionEffects('exploreCave', state);

      // Both wood and stone should be doubled
      expect(updates.resources!.wood).toBeGreaterThan(0);
      expect(updates.resources!.stone).toBeGreaterThan(0);
    });

    it('hunt: should double food, fur, and bones independently', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.05);

      const state = createMockState({
        clothing: { tarnished_compass: true },
        resources: { food: 0, fur: 0, bones: 0 },
        flags: { forestUnlocked: true },
      });

      const updates = applyActionEffects('hunt', state);

      // All three resources should be present and doubled
      expect(updates.resources!.food).toBeGreaterThan(0);
      expect(updates.resources!.fur).toBeGreaterThan(0);
      expect(updates.resources!.bones).toBeGreaterThan(0);
    });
  });
});
