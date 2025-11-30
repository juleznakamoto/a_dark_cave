
import { describe, it, expect } from 'vitest';
import { SHOP_ITEMS } from './shopItems';

describe('Shop Items Configuration', () => {
  describe('Item Structure', () => {
    it('should have valid structure for all items', () => {
      Object.entries(SHOP_ITEMS).forEach(([key, item]) => {
        expect(item.id).toBe(key);
        expect(item.name).toBeTruthy();
        expect(item.description).toBeTruthy();
        expect(typeof item.price).toBe('number');
        expect(item.price).toBeGreaterThanOrEqual(0);
        expect(item.rewards).toBeDefined();
        expect(typeof item.canPurchaseMultipleTimes).toBe('boolean');
        expect(item.category).toBeTruthy();
      });
    });

    it('should have valid prices', () => {
      Object.values(SHOP_ITEMS).forEach(item => {
        if (item.originalPrice) {
          expect(item.originalPrice).toBeGreaterThan(item.price);
        }
      });
    });
  });

  describe('Repeatable Items', () => {
    it('should allow multiple purchases of gold items', () => {
      expect(SHOP_ITEMS.gold_250.canPurchaseMultipleTimes).toBe(true);
      expect(SHOP_ITEMS.gold_1000.canPurchaseMultipleTimes).toBe(true);
      expect(SHOP_ITEMS.gold_5000.canPurchaseMultipleTimes).toBe(true);
      expect(SHOP_ITEMS.gold_20000.canPurchaseMultipleTimes).toBe(true);
    });

    it('should allow multiple purchases of feast items', () => {
      expect(SHOP_ITEMS.great_feast_1.canPurchaseMultipleTimes).toBe(true);
      expect(SHOP_ITEMS.great_feast_3.canPurchaseMultipleTimes).toBe(true);
    });

    it('should not allow multiple purchases of free gift', () => {
      expect(SHOP_ITEMS.gold_100_free.canPurchaseMultipleTimes).toBe(false);
    });
  });

  describe('Rewards', () => {
    it('should have valid resource rewards', () => {
      const goldItems = [
        SHOP_ITEMS.gold_100_free,
        SHOP_ITEMS.gold_250,
        SHOP_ITEMS.gold_1000,
        SHOP_ITEMS.gold_5000,
        SHOP_ITEMS.gold_20000,
      ];

      goldItems.forEach(item => {
        expect(item.rewards.resources).toBeDefined();
        expect(item.rewards.resources?.gold).toBeGreaterThan(0);
      });
    });

    it('should have valid feast activations', () => {
      expect(SHOP_ITEMS.great_feast_1.rewards.feastActivations).toBe(1);
      expect(SHOP_ITEMS.great_feast_3.rewards.feastActivations).toBe(5);
    });
  });

  describe('Free Items', () => {
    it('should have correct price for free items', () => {
      expect(SHOP_ITEMS.gold_100_free.price).toBe(0);
    });
  });

  describe('Categories', () => {
    it('should categorize items correctly', () => {
      expect(SHOP_ITEMS.gold_250.category).toBe('resource');
      expect(SHOP_ITEMS.great_feast_1.category).toBe('feast');
      expect(SHOP_ITEMS.cruel_mode.category).toBe('blessing');
    });
  });

  describe('Symbols and Colors', () => {
    it('should have symbols for visual items', () => {
      expect(SHOP_ITEMS.gold_100_free.symbol).toBeTruthy();
      expect(SHOP_ITEMS.gold_250.symbol).toBeTruthy();
      expect(SHOP_ITEMS.great_feast_1.symbol).toBeTruthy();
      expect(SHOP_ITEMS.cruel_mode.symbol).toBeTruthy();
    });

    it('should have colors for items with symbols', () => {
      Object.values(SHOP_ITEMS).forEach(item => {
        if (item.symbol) {
          expect(item.symbolColor).toBeTruthy();
        }
      });
    });
  });
});
