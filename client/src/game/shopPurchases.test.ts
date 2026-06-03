import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '@/game/state';
import {
  applyFeastActivationsFromPurchaseRows,
  purchaseIdToItemId,
  purchaseIdsFromRows,
  rehydratePurchasesFromSupabase,
} from './shopPurchases';

vi.mock('@/game/auth', () => ({
  getSessionUser: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn(),
}));

describe('shopPurchases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGameStore.setState({
      feastActivations: {},
      activatedPurchases: {},
    });
  });

  describe('purchaseIdToItemId', () => {
    it('parses numeric suffix ids', () => {
      expect(purchaseIdToItemId('purchase-great_feast_1-42')).toBe(
        'great_feast_1',
      );
    });

    it('parses hyphenated item ids', () => {
      expect(purchaseIdToItemId('purchase-cruel_mode-99')).toBe('cruel_mode');
    });
  });

  describe('purchaseIdsFromRows', () => {
    it('builds purchase ids from rows', () => {
      expect(
        purchaseIdsFromRows([
          { id: 1, item_id: 'great_feast_1' },
          { id: 2, item_id: 'gold_5000' },
        ]),
      ).toEqual(['purchase-great_feast_1-1', 'purchase-gold_5000-2']);
    });
  });

  describe('applyFeastActivationsFromPurchaseRows', () => {
    it('adds feast activations for feast items not yet in state', () => {
      applyFeastActivationsFromPurchaseRows([
        { id: 7, item_id: 'great_feast_1' },
      ]);

      expect(useGameStore.getState().feastActivations).toEqual({
        'purchase-great_feast_1-7': 1,
      });
    });

    it('does not overwrite existing feast activation counts', () => {
      useGameStore.setState({
        feastActivations: { 'purchase-great_feast_1-7': 0 },
      });

      applyFeastActivationsFromPurchaseRows([
        { id: 7, item_id: 'great_feast_1' },
      ]);

      expect(useGameStore.getState().feastActivations).toEqual({
        'purchase-great_feast_1-7': 0,
      });
    });
  });

  describe('rehydratePurchasesFromSupabase', () => {
    it('returns purchase ids and merges feast state', async () => {
      const { getSessionUser } = await import('@/game/auth');
      vi.mocked(getSessionUser).mockResolvedValue({
        id: 'anon-1',
        email: '',
      });

      const from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve({
              data: [{ id: 3, item_id: 'great_feast_3' }],
              error: null,
            }),
          ),
        })),
      }));

      const { getSupabaseClient } = await import('@/lib/supabase');
      vi.mocked(getSupabaseClient).mockResolvedValue({ from } as never);

      const ids = await rehydratePurchasesFromSupabase();

      expect(ids).toEqual(['purchase-great_feast_3-3']);
      expect(useGameStore.getState().feastActivations).toEqual({
        'purchase-great_feast_3-3': 3,
      });
    });

    it('returns empty array when no session user', async () => {
      const { getSessionUser } = await import('@/game/auth');
      vi.mocked(getSessionUser).mockResolvedValue(null);

      const ids = await rehydratePurchasesFromSupabase();
      expect(ids).toEqual([]);
    });
  });
});
