import { describe, it, expect } from 'vitest';
import {
  validateSaveGame,
  getStorageLimit,
  SaveGameState,
  MAX_SILVER_DELTA,
  MAX_GOLD_DELTA,
} from './saveValidation';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal existing state with sensible defaults. */
function makeState(overrides: Partial<SaveGameState> = {}): SaveGameState {
  return {
    resources: { wood: 0, stone: 0, food: 0, gold: 0, silver: 0 },
    buildings: {},
    activatedPurchases: {},
    claimedAchievements: [],
    ...overrides,
  };
}

/**
 * Simulate what the SQL does: shallow-merge the diff on top of existing state.
 * JSONB `||` replaces top-level keys, so the diff's `resources` object fully
 * replaces the existing `resources` key (not a deep merge).
 */
function merge(existing: SaveGameState, diff: Partial<SaveGameState>): SaveGameState {
  return { ...existing, ...diff };
}

// ===========================================================================
// getStorageLimit
// ===========================================================================

describe('getStorageLimit', () => {
  it('returns 500 when no buildings are present', () => {
    expect(getStorageLimit({})).toBe(500);
  });

  it('returns 500 when buildings is undefined', () => {
    expect(getStorageLimit(undefined)).toBe(500);
  });

  it.each([
    ['supplyHut', 1000],
    ['storehouse', 2500],
    ['fortifiedStorehouse', 5000],
    ['villageWarehouse', 10000],
    ['grandRepository', 25000],
    ['greatVault', 50000],
  ] as const)('returns %i for %s', (building, expected) => {
    expect(getStorageLimit({ [building]: 1 })).toBe(expected);
  });

  it('uses the highest tier when multiple storage buildings exist', () => {
    expect(
      getStorageLimit({ supplyHut: 1, storehouse: 1, greatVault: 1 }),
    ).toBe(50000);
  });
});

// ===========================================================================
// validateSaveGame – first save / game restart
// ===========================================================================

describe('validateSaveGame – skip conditions', () => {
  it('passes validation when existingState is null (first save)', () => {
    const merged = makeState({ resources: { gold: 999999, silver: 999999, wood: 999999 } });
    const result = validateSaveGame(null, merged, merged);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('passes validation when allowPlaytimeOverwrite is true (game restart)', () => {
    const existing = makeState({ resources: { gold: 0, silver: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { gold: 999999, silver: 999999, wood: 999999 } };
    const merged = merge(existing, diff);
    const result = validateSaveGame(existing, merged, diff, true);
    expect(result.valid).toBe(true);
  });
});

// ===========================================================================
// Limited resources – storage cap validation
// ===========================================================================

describe('validateSaveGame – limited resource storage caps', () => {
  it('rejects wood exceeding default storage limit (500)', () => {
    const existing = makeState({ resources: { wood: 100, gold: 0, silver: 0 } });
    const diff: Partial<SaveGameState> = { resources: { wood: 600, gold: 0, silver: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'RESOURCE_OVER_STORAGE_LIMIT' }),
    );
  });

  it('allows wood at exactly the storage limit', () => {
    const existing = makeState({ resources: { wood: 400, gold: 0, silver: 0 } });
    const diff: Partial<SaveGameState> = { resources: { wood: 500, gold: 0, silver: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('allows wood below storage limit', () => {
    const existing = makeState({ resources: { wood: 100, gold: 0, silver: 0 } });
    const diff: Partial<SaveGameState> = { resources: { wood: 300, gold: 0, silver: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('uses storage building limit when supply hut is built', () => {
    const existing = makeState({
      resources: { wood: 500, gold: 0, silver: 0 },
      buildings: { supplyHut: 1 },
    });
    const diff: Partial<SaveGameState> = { resources: { wood: 1000, gold: 0, silver: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('rejects wood exceeding supply hut limit of 1000', () => {
    const existing = makeState({
      resources: { wood: 500, gold: 0, silver: 0 },
      buildings: { supplyHut: 1 },
    });
    const diff: Partial<SaveGameState> = { resources: { wood: 1001, gold: 0, silver: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('RESOURCE_OVER_STORAGE_LIMIT');
  });

  it('respects great vault limit of 50000', () => {
    const existing = makeState({
      resources: { wood: 10000, gold: 0, silver: 0 },
      buildings: { greatVault: 1 },
    });
    const diff: Partial<SaveGameState> = { resources: { wood: 50000, gold: 0, silver: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('rejects wood exceeding great vault limit of 50000', () => {
    const existing = makeState({
      resources: { wood: 10000, gold: 0, silver: 0 },
      buildings: { greatVault: 1 },
    });
    const diff: Partial<SaveGameState> = { resources: { wood: 50001, gold: 0, silver: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
  });

  it('validates all limited resource types', () => {
    const limitedResources = [
      'wood', 'stone', 'food', 'bones', 'fur', 'leather',
      'iron', 'coal', 'sulfur', 'obsidian', 'adamant', 'steel',
      'blacksteel', 'moonstone', 'black_powder', 'torch',
    ];

    for (const resource of limitedResources) {
      const existing = makeState({ resources: { [resource]: 0, gold: 0, silver: 0 } });
      const diff: Partial<SaveGameState> = { resources: { [resource]: 501, gold: 0, silver: 0 } };
      const merged = merge(existing, diff);

      const result = validateSaveGame(existing, merged, diff);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'RESOURCE_OVER_STORAGE_LIMIT' }),
      );
    }
  });

  it('does NOT cap gold or silver with storage limits', () => {
    const existing = makeState({ resources: { gold: 0, silver: 0, wood: 0 } });
    // Gold and silver can be any value – only delta rules apply
    const diff: Partial<SaveGameState> = {
      resources: { gold: 1000, silver: 4000, wood: 0 },
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('reports multiple resources exceeding limit at once', () => {
    const existing = makeState({ resources: { wood: 0, stone: 0, food: 0, gold: 0, silver: 0 } });
    const diff: Partial<SaveGameState> = {
      resources: { wood: 9999, stone: 9999, food: 9999, gold: 0, silver: 0 },
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
    const overLimitErrors = result.errors.filter(e => e.code === 'RESOURCE_OVER_STORAGE_LIMIT');
    expect(overLimitErrors.length).toBe(3);
  });
});

// ===========================================================================
// Silver delta validation
// ===========================================================================

describe('validateSaveGame – silver delta', () => {
  it('allows silver increase of exactly 5000', () => {
    const existing = makeState({ resources: { silver: 1000, gold: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { silver: 6000, gold: 0, wood: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('rejects silver increase over 5000', () => {
    const existing = makeState({ resources: { silver: 1000, gold: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { silver: 6001, gold: 0, wood: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'SILVER_DELTA_EXCEEDED' }),
    );
  });

  it('allows silver decrease of any amount (spending)', () => {
    const existing = makeState({ resources: { silver: 50000, gold: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { silver: 0, gold: 0, wood: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('allows silver increase over 5000 when claimedAchievements changed', () => {
    const existing = makeState({
      resources: { silver: 1000, gold: 0, wood: 0 },
      claimedAchievements: ['ach1'],
    });
    const diff: Partial<SaveGameState> = {
      resources: { silver: 20000, gold: 0, wood: 0 },
      claimedAchievements: ['ach1', 'ach2', 'ach3'],
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('rejects silver increase over 5000 when claimedAchievements did NOT change', () => {
    const existing = makeState({
      resources: { silver: 0, gold: 0, wood: 0 },
      claimedAchievements: ['ach1'],
    });
    // diff does NOT include claimedAchievements
    const diff: Partial<SaveGameState> = {
      resources: { silver: 10000, gold: 0, wood: 0 },
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'SILVER_DELTA_EXCEEDED' }),
    );
  });

  it('allows zero silver change', () => {
    const existing = makeState({ resources: { silver: 500, gold: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { silver: 500, gold: 0, wood: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });
});

// ===========================================================================
// Gold delta validation
// ===========================================================================

describe('validateSaveGame – gold delta', () => {
  it('allows gold increase of exactly 1500', () => {
    const existing = makeState({ resources: { gold: 100, silver: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { gold: 1600, silver: 0, wood: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('rejects gold increase over 1500', () => {
    const existing = makeState({ resources: { gold: 100, silver: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { gold: 1601, silver: 0, wood: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'GOLD_DELTA_EXCEEDED' }),
    );
  });

  it('allows gold decrease of any amount (spending)', () => {
    const existing = makeState({ resources: { gold: 10000, silver: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { gold: 0, silver: 0, wood: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('allows gold increase over 1500 when activatedPurchases changed', () => {
    const existing = makeState({
      resources: { gold: 0, silver: 0, wood: 0 },
      activatedPurchases: {},
    });
    const diff: Partial<SaveGameState> = {
      resources: { gold: 50000, silver: 0, wood: 0 },
      activatedPurchases: { premium_bundle: true },
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('rejects gold increase over 1500 when activatedPurchases did NOT change', () => {
    const existing = makeState({
      resources: { gold: 0, silver: 0, wood: 0 },
      activatedPurchases: { premium_bundle: true },
    });
    // diff does NOT include activatedPurchases
    const diff: Partial<SaveGameState> = {
      resources: { gold: 5000, silver: 0, wood: 0 },
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'GOLD_DELTA_EXCEEDED' }),
    );
  });

  it('allows zero gold change', () => {
    const existing = makeState({ resources: { gold: 500, silver: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { gold: 500, silver: 0, wood: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('allows small gold increase', () => {
    const existing = makeState({ resources: { gold: 0, silver: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { gold: 1499, silver: 0, wood: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });
});

// ===========================================================================
// Combined / realistic attack scenarios
// ===========================================================================

describe('validateSaveGame – combined manipulation scenarios', () => {
  it('rejects a save with manipulated gold AND wood', () => {
    const existing = makeState({
      resources: { gold: 0, silver: 0, wood: 100 },
    });
    const diff: Partial<SaveGameState> = {
      resources: { gold: 99999, silver: 0, wood: 99999 },
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    const codes = result.errors.map(e => e.code);
    expect(codes).toContain('GOLD_DELTA_EXCEEDED');
    expect(codes).toContain('RESOURCE_OVER_STORAGE_LIMIT');
  });

  it('rejects a save with manipulated silver AND gold', () => {
    const existing = makeState({ resources: { gold: 0, silver: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = {
      resources: { gold: 99999, silver: 99999, wood: 0 },
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
    const codes = result.errors.map(e => e.code);
    expect(codes).toContain('GOLD_DELTA_EXCEEDED');
    expect(codes).toContain('SILVER_DELTA_EXCEEDED');
  });

  it('allows a legitimate save with normal play progression', () => {
    const existing = makeState({
      resources: { wood: 800, stone: 600, food: 400, gold: 50, silver: 200 },
      buildings: { supplyHut: 1 },
    });
    // Player gathered some resources, earned a bit of gold and silver
    const diff: Partial<SaveGameState> = {
      resources: { wood: 950, stone: 700, food: 450, gold: 100, silver: 500 },
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('allows a purchase scenario: large gold increase with activatedPurchases change', () => {
    const existing = makeState({
      resources: { gold: 100, silver: 0, wood: 0 },
      activatedPurchases: {},
    });
    const diff: Partial<SaveGameState> = {
      resources: { gold: 10100, silver: 0, wood: 0 },
      activatedPurchases: { gold_pack: true },
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('allows an achievement claim scenario: large silver increase with claimedAchievements change', () => {
    const existing = makeState({
      resources: { gold: 0, silver: 100, wood: 0 },
      claimedAchievements: [],
    });
    const diff: Partial<SaveGameState> = {
      resources: { gold: 0, silver: 15000, wood: 0 },
      claimedAchievements: ['tier1', 'tier2', 'tier3'],
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('rejects cheater who tries to sneak gold alongside a legitimate purchase', () => {
    // activatedPurchases changed (legitimate), but silver also inflated without achievements
    const existing = makeState({
      resources: { gold: 0, silver: 0, wood: 0 },
      activatedPurchases: {},
      claimedAchievements: [],
    });
    const diff: Partial<SaveGameState> = {
      resources: { gold: 50000, silver: 99999, wood: 0 },
      activatedPurchases: { gold_pack: true },
      // claimedAchievements NOT in diff — silver increase is illegitimate
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
    const codes = result.errors.map(e => e.code);
    // Gold should pass (activatedPurchases changed), but silver should fail
    expect(codes).not.toContain('GOLD_DELTA_EXCEEDED');
    expect(codes).toContain('SILVER_DELTA_EXCEEDED');
  });

  it('rejects cheater who adds claimedAchievements but also inflates gold', () => {
    const existing = makeState({
      resources: { gold: 0, silver: 0, wood: 0 },
      claimedAchievements: [],
    });
    const diff: Partial<SaveGameState> = {
      resources: { gold: 99999, silver: 10000, wood: 0 },
      claimedAchievements: ['ach1'],
      // activatedPurchases NOT in diff — gold increase is illegitimate
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
    const codes = result.errors.map(e => e.code);
    // Silver should pass (claimedAchievements changed), but gold should fail
    expect(codes).not.toContain('SILVER_DELTA_EXCEEDED');
    expect(codes).toContain('GOLD_DELTA_EXCEEDED');
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================

describe('validateSaveGame – edge cases', () => {
  it('handles missing resources in existing state gracefully', () => {
    const existing: SaveGameState = { buildings: {} };
    const diff: Partial<SaveGameState> = {
      resources: { gold: 100, silver: 100, wood: 100 },
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('handles missing resources in merged state gracefully', () => {
    const existing = makeState({ resources: { gold: 100, silver: 100, wood: 100 } });
    const diff: Partial<SaveGameState> = {};
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('handles building upgrade in same save that uses higher limit', () => {
    // Player builds a storehouse AND has resources up to the new limit
    const existing = makeState({
      resources: { wood: 400, gold: 0, silver: 0 },
      buildings: {},
    });
    const diff: Partial<SaveGameState> = {
      resources: { wood: 2000, gold: 0, silver: 0 },
      buildings: { storehouse: 1 },
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    // Should pass because merged state has storehouse → limit is 2500
    expect(result.valid).toBe(true);
  });

  it('validates against the merged buildings, not existing buildings', () => {
    // Existing had no storage, but diff upgrades to great vault
    const existing = makeState({
      resources: { wood: 100, gold: 0, silver: 0 },
      buildings: {},
    });
    const diff: Partial<SaveGameState> = {
      resources: { wood: 40000, gold: 0, silver: 0 },
      buildings: { greatVault: 1 },
    };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('gold at exactly delta boundary (1500) is allowed', () => {
    const existing = makeState({ resources: { gold: 0, silver: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { gold: MAX_GOLD_DELTA, silver: 0, wood: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('silver at exactly delta boundary (5000) is allowed', () => {
    const existing = makeState({ resources: { gold: 0, silver: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { gold: 0, silver: MAX_SILVER_DELTA, wood: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(true);
  });

  it('gold at 1 over delta boundary (1501) is rejected', () => {
    const existing = makeState({ resources: { gold: 0, silver: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { gold: MAX_GOLD_DELTA + 1, silver: 0, wood: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
  });

  it('silver at 1 over delta boundary (5001) is rejected', () => {
    const existing = makeState({ resources: { gold: 0, silver: 0, wood: 0 } });
    const diff: Partial<SaveGameState> = { resources: { gold: 0, silver: MAX_SILVER_DELTA + 1, wood: 0 } };
    const merged = merge(existing, diff);

    const result = validateSaveGame(existing, merged, diff);
    expect(result.valid).toBe(false);
  });
});
