
import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '@shared/schema';
import { villageAttackEvents } from './eventsVillageAttacks';
import { killVillagers } from '@/game/stateHelpers';

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
        seen: {
          ashenGreatshieldTest: false,
        } 
      },
      relics: {},
      weapons: {
        ashen_greatshield: true, // Equipped
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

  it('should trigger test event when Ashen Greatshield is equipped', () => {
    const event = villageAttackEvents.testAshenGreatshield;
    
    expect(event.condition(mockState)).toBe(true);
  });

  it('should not trigger if shield is not equipped', () => {
    mockState.weapons.ashen_greatshield = false;
    const event = villageAttackEvents.testAshenGreatshield;
    
    expect(event.condition(mockState)).toBe(false);
  });

  it('should not trigger if already seen', () => {
    mockState.story.seen.ashenGreatshieldTest = true;
    const event = villageAttackEvents.testAshenGreatshield;
    
    expect(event.condition(mockState)).toBe(false);
  });

  it('should reduce deaths by 25% with Ashen Greatshield', () => {
    const event = villageAttackEvents.testAshenGreatshield;
    const choice = event.choices![0];
    
    // Run the test multiple times to verify average reduction
    const results: number[] = [];
    const baseDeaths = 10;
    
    for (let i = 0; i < 100; i++) {
      const testState = { ...mockState };
      const result = choice.effect!(testState);
      results.push(result.villagersKilled || 0);
    }
    
    // Calculate average deaths
    const avgDeaths = results.reduce((sum, deaths) => sum + deaths, 0) / results.length;
    
    // Expected deaths with 25% reduction: 10 * 0.75 = 7.5
    // Allow some variance due to random distribution in killVillagers
    expect(avgDeaths).toBeGreaterThanOrEqual(6.5);
    expect(avgDeaths).toBeLessThanOrEqual(8.5);
  });

  it('should mark event as seen after completion', () => {
    const event = villageAttackEvents.testAshenGreatshield;
    const choice = event.choices![0];
    
    const result = choice.effect!(mockState);
    
    expect(result.story?.seen?.ashenGreatshieldTest).toBe(true);
  });

  it('should include damage reduction info in log message', () => {
    const event = villageAttackEvents.testAshenGreatshield;
    const choice = event.choices![0];
    
    const result = choice.effect!(mockState);
    
    expect(result._logMessage).toContain('25% reduction');
    expect(result._logMessage).toContain('Base casualties: 10');
    expect(result._logMessage).toContain('Actual deaths after');
  });

  it('should verify killVillagers applies death reduction correctly', () => {
    // Test that killVillagers respects the eventDeathReduction from the shield
    const deathCount = 10;
    const result = killVillagers(mockState, deathCount);
    
    // With 25% reduction, 10 deaths should be reduced to ~7-8
    const actualDeaths = result.villagersKilled || 0;
    
    // The reduction should be noticeable
    expect(actualDeaths).toBeLessThan(deathCount);
    // Should be around 7-8 deaths (10 * 0.75 = 7.5, rounded up to 8)
    expect(actualDeaths).toBeGreaterThanOrEqual(6);
    expect(actualDeaths).toBeLessThanOrEqual(8);
  });
});
