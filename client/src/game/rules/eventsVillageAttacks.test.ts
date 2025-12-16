
import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '@shared/schema';
import { killVillagers } from '@/game/stateHelpers';
import { getTotalEventDeathReduction } from './effectsCalculation';

describe('Ashen Greatshield Event Death Reduction', () => {
  let mockState: GameState;

  beforeEach(() => {
    mockState = {
      resources: { 
        wood: 100, 
        food: 100, 
        stone: 50,
        iron: 0,
        steel: 0,
        adamant: 0,
        silver: 0,
        obsidian: 0,
        mithril: 0,
        clay: 0,
        leather: 0,
        bone: 0,
        ember: 0,
      },
      buildings: { 
        woodenHut: 3,
        stoneHut: 0,
        cabin: 0,
        estate: 0,
        manor: 0,
        storehouse: 0,
        fortifiedStorehouse: 0,
        villageWarehouse: 0,
        grandRepository: 0,
        greatVault: 0,
        shallowPit: 0,
        deepMine: 0,
        richVein: 0,
        quarry: 0,
        ironForge: 0,
        steelForger: 0,
        grandBlacksmith: 0,
        traps: 0,
        altar: 0,
        shrine: 0,
        temple: 0,
        sanctum: 0,
        blackMonolith: 0,
        boneTemple: 0,
        clerksHut: 0,
        scriptorium: 0,
        inkwardenAcademy: 0,
      },
      flags: { 
        villageUnlocked: true,
        hasHitResourceLimit: false,
      },
      villagers: { 
        free: 20, 
        gatherer: 0, 
        hunter: 0,
        iron_miner: 0,
        steel_forger: 0,
        clay_digger: 0,
      },
      current_population: 20,
      total_population: 20,
      events: {},
      log: [],
      story: { 
        seen: {} 
      },
      relics: {},
      weapons: {
        ashen_greatshield: false,
      },
      tools: {},
      clothing: {},
      blessings: {},
      fellowship: {},
      schematics: {},
      books: {},
      stats: {
        madness: 0,
        madnessFromEvents: 0,
        totalWoodGathered: 0,
        totalFoodGathered: 0,
        totalStoneGathered: 0,
        totalIronGathered: 0,
        totalSteelForged: 0,
        totalAdamantGathered: 0,
        totalObsidianGathered: 0,
        totalMithrilGathered: 0,
        totalClayGathered: 0,
        totalLeatherGathered: 0,
        totalBoneGathered: 0,
        totalEmberGathered: 0,
        totalSilverSpent: 0,
        totalCraftingActions: 0,
        totalBuildingActions: 0,
        totalVillagersRecruited: 0,
        totalVillagersDied: 0,
        totalEventsTriggered: 0,
        totalChoicesMade: 0,
        maxPopulationReached: 20,
        maxMadnessReached: 0,
      },
      feastState: { 
        isActive: false, 
        endTime: 0, 
        lastAcceptedLevel: 0 
      },
      greatFeastState: { 
        isActive: false, 
        endTime: 0 
      },
      CM: 0,
      cruelMode: false,
      isPaused: false,
      buttonUpgrades: {},
      huntingSkills: {
        level: 0,
        experience: 0,
      },
    } as GameState;
  });

  describe('getTotalEventDeathReduction', () => {
    it('should return 0 when Ashen Greatshield is not equipped', () => {
      const reduction = getTotalEventDeathReduction(mockState);
      expect(reduction).toBe(0);
    });

    it('should return 0.25 when Ashen Greatshield is equipped', () => {
      mockState.weapons.ashen_greatshield = true;
      const reduction = getTotalEventDeathReduction(mockState);
      expect(reduction).toBe(0.25);
    });
  });

  describe('killVillagers with Ashen Greatshield', () => {
    it('should not reduce deaths when shield is not equipped', () => {
      const deathCount = 10;
      const result = killVillagers(mockState, deathCount);
      
      expect(result.villagersKilled).toBe(10);
    });

    it('should reduce deaths by 25% when shield is equipped', () => {
      mockState.weapons.ashen_greatshield = true;
      const deathCount = 10;
      const result = killVillagers(mockState, deathCount);
      
      // 10 * 0.75 = 7.5, ceil(7.5) = 8
      expect(result.villagersKilled).toBe(8);
    });

    it('should round up partial deaths after reduction', () => {
      mockState.weapons.ashen_greatshield = true;
      
      // Test with 9 deaths: 9 * 0.75 = 6.75, ceil(6.75) = 7
      let result = killVillagers(mockState, 9);
      expect(result.villagersKilled).toBe(7);
      
      // Test with 7 deaths: 7 * 0.75 = 5.25, ceil(5.25) = 6
      result = killVillagers(mockState, 7);
      expect(result.villagersKilled).toBe(6);
    });

    it('should handle edge case of 1 death', () => {
      mockState.weapons.ashen_greatshield = true;
      const result = killVillagers(mockState, 1);
      
      // 1 * 0.75 = 0.75, ceil(0.75) = 1
      expect(result.villagersKilled).toBe(1);
    });

    it('should handle edge case of 2 deaths', () => {
      mockState.weapons.ashen_greatshield = true;
      const result = killVillagers(mockState, 2);
      
      // 2 * 0.75 = 1.5, ceil(1.5) = 2
      expect(result.villagersKilled).toBe(2);
    });

    it('should handle edge case of 4 deaths', () => {
      mockState.weapons.ashen_greatshield = true;
      const result = killVillagers(mockState, 4);
      
      // 4 * 0.75 = 3, ceil(3) = 3
      expect(result.villagersKilled).toBe(3);
    });

    it('should save exactly 2 villagers on 8 deaths', () => {
      mockState.weapons.ashen_greatshield = true;
      const result = killVillagers(mockState, 8);
      
      // 8 * 0.75 = 6, ceil(6) = 6 (saves 2 lives)
      expect(result.villagersKilled).toBe(6);
    });

    it('should save exactly 5 villagers on 20 deaths', () => {
      mockState.weapons.ashen_greatshield = true;
      const result = killVillagers(mockState, 20);
      
      // 20 * 0.75 = 15, ceil(15) = 15 (saves 5 lives)
      expect(result.villagersKilled).toBe(15);
    });

    it('should update villager counts correctly after reduction', () => {
      mockState.weapons.ashen_greatshield = true;
      mockState.villagers.free = 10;
      mockState.villagers.gatherer = 5;
      mockState.villagers.hunter = 3;
      
      const result = killVillagers(mockState, 10);
      
      // 10 * 0.75 = 7.5, ceil(7.5) = 8 deaths
      expect(result.villagersKilled).toBe(8);
      
      // Should kill all 10 free villagers first, but only need to kill 8 total
      expect(result.villagers?.free).toBe(2);
      expect(result.villagers?.gatherer).toBe(5);
      expect(result.villagers?.hunter).toBe(3);
    });

    it('should kill from other job types after free villagers when reduction applies', () => {
      mockState.weapons.ashen_greatshield = true;
      mockState.villagers.free = 5;
      mockState.villagers.gatherer = 10;
      mockState.villagers.hunter = 5;
      
      const result = killVillagers(mockState, 12);
      
      // 12 * 0.75 = 9, ceil(9) = 9 deaths
      expect(result.villagersKilled).toBe(9);
      
      // Should kill all 5 free villagers, then 4 more from gatherer/hunter
      expect(result.villagers?.free).toBe(0);
      const totalRemaining = (result.villagers?.gatherer || 0) + (result.villagers?.hunter || 0);
      expect(totalRemaining).toBe(11); // 15 - 4 = 11
    });
  });
});
