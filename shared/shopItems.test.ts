
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

  describe('Bundle Configuration', () => {
    it('should have bundle items in shop', () => {
      expect(SHOP_ITEMS.basic_survival_bundle).toBeDefined();
      expect(SHOP_ITEMS.basic_survival_bundle.category).toBe('bundle');
    });

    it('should have valid bundle structure', () => {
      const bundle = SHOP_ITEMS.basic_survival_bundle;
      expect(bundle.bundleComponents).toBeDefined();
      expect(Array.isArray(bundle.bundleComponents)).toBe(true);
      expect(bundle.bundleComponents!.length).toBeGreaterThan(0);
    });

    it('should reference valid component items', () => {
      const bundle = SHOP_ITEMS.basic_survival_bundle;
      bundle.bundleComponents!.forEach(componentId => {
        expect(SHOP_ITEMS[componentId]).toBeDefined();
      });
    });

    it('should have basic_survival bundle with correct components', () => {
      const bundle = SHOP_ITEMS.basic_survival_bundle;
      expect(bundle.bundleComponents).toContain('gold_5000');
      expect(bundle.bundleComponents).toContain('great_feast_1');
    });

    it('should have discounted bundle pricing', () => {
      const bundle = SHOP_ITEMS.basic_survival_bundle;
      expect(bundle.originalPrice).toBeDefined();
      expect(bundle.originalPrice).toBeGreaterThan(bundle.price);
      
      // Check that bundle is cheaper than buying components separately
      const componentsCost = bundle.bundleComponents!.reduce((total, componentId) => {
        return total + SHOP_ITEMS[componentId].price;
      }, 0);
      
      expect(bundle.price).toBeLessThan(componentsCost);
    });

    it('should allow bundle to be purchased multiple times', () => {
      expect(SHOP_ITEMS.basic_survival_bundle.canPurchaseMultipleTimes).toBe(true);
    });

    it('should have bundle rewards that match components', () => {
      const bundle = SHOP_ITEMS.basic_survival_bundle;
      
      // Bundle should have combined rewards
      expect(bundle.rewards.resources?.gold).toBe(5000);
      expect(bundle.rewards.feastActivations).toBe(1);
    });

    it('should have appropriate activation message', () => {
      const bundle = SHOP_ITEMS.basic_survival_bundle;
      expect(bundle.activationMessage).toBeDefined();
      expect(bundle.activationMessage).toContain('Bundle');
    });

    it('should have bundle symbol and color', () => {
      const bundle = SHOP_ITEMS.basic_survival_bundle;
      expect(bundle.symbol).toBeTruthy();
      expect(bundle.symbolColor).toBeTruthy();
    });

    it('should not have conflicting reward types in bundle', () => {
      const bundle = SHOP_ITEMS.basic_survival_bundle;
      
      // Bundles should not grant tools/weapons/blessings directly
      // since components are granted individually
      expect(bundle.rewards.tools).toBeUndefined();
      expect(bundle.rewards.weapons).toBeUndefined();
      expect(bundle.rewards.blessings).toBeUndefined();
    });

    it('should have component items that can be purchased individually', () => {
      const bundle = SHOP_ITEMS.basic_survival_bundle;
      
      bundle.bundleComponents!.forEach(componentId => {
        const component = SHOP_ITEMS[componentId];
        expect(component.canPurchaseMultipleTimes).toBe(true);
      });
    });

    it('should have bundle description mentioning components', () => {
      const bundle = SHOP_ITEMS.basic_survival_bundle;
      expect(bundle.description.toLowerCase()).toContain('gold');
      expect(bundle.description.toLowerCase()).toContain('feast');
    });

    it('should validate bundle pricing formula', () => {
      const bundle = SHOP_ITEMS.basic_survival_bundle;
      
      // Original price should be sum of component original/current prices
      const gold5000 = SHOP_ITEMS.gold_5000;
      const feast1 = SHOP_ITEMS.great_feast_1;
      
      const expectedOriginalPrice = 
        (gold5000.originalPrice || gold5000.price) + 
        (feast1.originalPrice || feast1.price);
      
      expect(bundle.originalPrice).toBe(expectedOriginalPrice);
    });

    it('should have bundle with reasonable discount percentage', () => {
      const bundle = SHOP_ITEMS.basic_survival_bundle;
      const discountPercent = ((bundle.originalPrice! - bundle.price) / bundle.originalPrice!) * 100;
      
      // Should have at least 40% discount to make bundle attractive
      expect(discountPercent).toBeGreaterThanOrEqual(40);
      // But not more than 60% (too generous)
      expect(discountPercent).toBeLessThanOrEqual(60);
    });

    it('should ensure bundle components exist and are not other bundles', () => {
      Object.values(SHOP_ITEMS).forEach(item => {
        if (item.category === 'bundle' && item.bundleComponents) {
          item.bundleComponents.forEach(componentId => {
            const component = SHOP_ITEMS[componentId];
            expect(component).toBeDefined();
            expect(component.category).not.toBe('bundle'); // No nested bundles
          });
        }
      });
    });

    it('should have unique bundle components (no duplicates)', () => {
      Object.values(SHOP_ITEMS).forEach(item => {
        if (item.category === 'bundle' && item.bundleComponents) {
          const uniqueComponents = new Set(item.bundleComponents);
          expect(uniqueComponents.size).toBe(item.bundleComponents.length);
        }
      });
    });

    it('should have bundle name indicating it is a bundle', () => {
      Object.values(SHOP_ITEMS).forEach(item => {
        if (item.category === 'bundle') {
          expect(item.name.toLowerCase()).toContain('bundle');
        }
      });
    });
  });
});
