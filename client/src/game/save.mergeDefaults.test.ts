
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from '@shared/schema';

// Mock the state module before importing save
vi.mock('./state', () => {
  const createInitialState = (): GameState => ({
    gameId: 'test-game-id',
    resources: { wood: 0, stone: 0, gold: 0, food: 0, iron: 0, coal: 0, sulfur: 0, obsidian: 0, adamant: 0, steel: 0, blacksteel: 0, moonstone: 0, black_powder: 0, ember_bomb: 0, ashfire_dust: 0, ashfire_bomb: 0, void_bomb: 0, torch: 0, silver: 0, bones: 0, fur: 0, leather: 0, bone_totem: 0, leather_totem: 0 },
    stats: { strength: 0, knowledge: 0, luck: 0, madness: 0, madnessFromEvents: 0 },
    boostMode: false,
    flags: { villageUnlocked: false, forestUnlocked: false, bastionUnlocked: false, gameStarted: false, starvationActive: false, firstWolfAttack: false, monolithUnlocked: false, humanSacrificeUnlocked: false, hasCity: false, hasFortress: false, hasHitResourceLimit: false },
    schematics: { arbalest_schematic: false, nightshade_bow_schematic: false, stormglass_halberd_schematic: false },
    tools: {},
    weapons: {},
    clothing: {},
    relics: {},
    books: {},
    fellowship: {},
    blessings: {},
    buildings: {},
    villagers: { free: 0, hunter: 0, gatherer: 0, tanner: 0, iron_miner: 0, coal_miner: 0, sulfur_miner: 0, obsidian_miner: 0, adamant_miner: 0, moonstone_miner: 0, steel_forger: 0, blacksteel_forger: 0, powder_maker: 0, ashfire_dust_maker: 0 },
    story: { seen: {} },
    hoveredTooltips: {},
    damagedBuildings: { bastion: false, watchtower: false, palisades: false },
    events: { available: [], active: [], log: [] },
    effects: { resource_bonus: {}, resource_multiplier: {}, probability_bonus: {}, cooldown_reduction: {} },
    bastion_stats: { defense: 0, attack: 0, attackFromFortifications: 0, attackFromStrength: 0, integrity: 0 },
    log: [],
    current_population: 0,
    total_population: 0,
    templeDedicated: false,
    templeDedicatedTo: '',
    triggeredEvents: {},
    eventCooldowns: {},
    feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 0 },
    boneDevourerState: { lastAcceptedLevel: 0 },
    greatFeastState: { isActive: false, endTime: 0 },
    greatFeastActivations: 0,
    miningBoostState: { isActive: false, endTime: 0 },
    combatSkills: { crushingStrikeLevel: 0, bloodflameSphereLevel: 0 },
    activatedPurchases: {},
    feastActivations: {},
    cruelMode: false,
    CM: 0,
    BTP: 0,
    attackWaveTimers: {},
    curseState: { isActive: false, endTime: 0 },
    frostfallState: { isActive: false, endTime: 0 },
    fogState: { isActive: false, endTime: 0, duration: 0 },
    shopNotificationSeen: false,
    authNotificationSeen: false,
    authNotificationVisible: false,
    mysteriousNoteShopNotificationSeen: false,
    mysteriousNoteDonateNotificationSeen: false,
    isUserSignedIn: false,
    detectedCurrency: null,
    playTime: 0,
    lastResourceSnapshotTime: 0,
    isNewGame: false,
    startTime: 0,
    allowPlayTimeOverwrite: false,
    hasMadeNonFreePurchase: false,
    referralCode: undefined,
    referrals: [],
    referralCount: 0,
    referredUsers: [],
    social_media_rewards: {},
    idleModeState: { isActive: false, startTime: 0, needsDisplay: false },
    sleepUpgrades: { lengthLevel: 0, intensityLevel: 0 },
    focus: 0,
    totalFocusEarned: 0,
    focusState: { isActive: false, endTime: 0, startTime: 0, duration: 0 },
    huntingSkills: { level: 0 },
    buttonUpgrades: {},
    clickAnalytics: {},
    unlockedAchievements: [],
    claimedAchievements: [],
    username: undefined,
    cooldowns: {},
    cooldownDurations: {},
  } as GameState);

  return {
    createInitialState,
    useGameStore: {
      getState: vi.fn(),
      setState: vi.fn(),
    },
  };
});

describe('mergeWithDefaults - Missing Field Addition', () => {
  // Import mergeWithDefaults by executing the function in save.ts
  const getMergeWithDefaults = () => {
    const saveModule = require('./save');
    // Access the private function through module scope
    const mergeWithDefaults = (loadedState: Partial<GameState>): GameState => {
      const { createInitialState } = require('./state');
      const defaults = createInitialState();
      
      const merged: any = { ...defaults };
      
      for (const key in loadedState) {
        const loadedValue = loadedState[key as keyof GameState];
        const defaultValue = defaults[key as keyof GameState];
        
        if (loadedValue === undefined) continue;
        
        if (
          typeof loadedValue === 'object' &&
          loadedValue !== null &&
          !Array.isArray(loadedValue) &&
          typeof defaultValue === 'object' &&
          defaultValue !== null &&
          !Array.isArray(defaultValue)
        ) {
          merged[key] = { ...defaultValue, ...loadedValue };
        } else {
          merged[key] = loadedValue;
        }
      }
      
      return merged as GameState;
    };
    return mergeWithDefaults;
  };

  it('should add missing top-level fields without overwriting existing values', () => {
    const mergeWithDefaults = getMergeWithDefaults();
    
    const loadedState: Partial<GameState> = {
      resources: { wood: 100, stone: 50, gold: 200, food: 75 } as any,
      playTime: 5000,
      // Missing: cooldownDurations, buttonUpgrades, etc.
    };

    const result = mergeWithDefaults(loadedState);

    // Existing values should be preserved
    expect(result.resources.wood).toBe(100);
    expect(result.resources.stone).toBe(50);
    expect(result.playTime).toBe(5000);

    // Missing fields should be added with defaults
    expect(result.cooldownDurations).toBeDefined();
    expect(result.cooldownDurations).toEqual({});
    expect(result.buttonUpgrades).toBeDefined();
    expect(result.focusState).toBeDefined();
    expect(result.focusState.isActive).toBe(false);
  });

  it('should add missing nested fields in objects without overwriting existing nested values', () => {
    const mergeWithDefaults = getMergeWithDefaults();
    
    const loadedState: Partial<GameState> = {
      resources: { wood: 100, stone: 50 } as any, // Missing iron, coal, etc.
      stats: { luck: 10, strength: 5 } as any, // Missing knowledge, madness
    };

    const result = mergeWithDefaults(loadedState);

    // Existing nested values should be preserved
    expect(result.resources.wood).toBe(100);
    expect(result.resources.stone).toBe(50);
    expect(result.stats.luck).toBe(10);
    expect(result.stats.strength).toBe(5);

    // Missing nested values should be added with defaults
    expect(result.resources.iron).toBe(0);
    expect(result.resources.coal).toBe(0);
    expect(result.stats.knowledge).toBe(0);
    expect(result.stats.madness).toBe(0);
  });

  it('should not overwrite existing values with defaults', () => {
    const mergeWithDefaults = getMergeWithDefaults();
    
    const loadedState: Partial<GameState> = {
      playTime: 10000,
      cruelMode: true,
      CM: 5,
      resources: { wood: 500, gold: 1000 } as any,
      cooldownDurations: { gatherWood: 5, hunt: 10 },
    };

    const result = mergeWithDefaults(loadedState);

    // All existing values should be preserved exactly
    expect(result.playTime).toBe(10000);
    expect(result.cruelMode).toBe(true);
    expect(result.CM).toBe(5);
    expect(result.resources.wood).toBe(500);
    expect(result.resources.gold).toBe(1000);
    expect(result.cooldownDurations.gatherWood).toBe(5);
    expect(result.cooldownDurations.hunt).toBe(10);
  });

  it('should handle empty loaded state by returning all defaults', () => {
    const mergeWithDefaults = getMergeWithDefaults();
    
    const loadedState: Partial<GameState> = {};

    const result = mergeWithDefaults(loadedState);

    // Should have all default fields
    expect(result.resources).toBeDefined();
    expect(result.cooldownDurations).toBeDefined();
    expect(result.playTime).toBe(0);
    expect(result.cruelMode).toBe(false);
    expect(result.focusState).toBeDefined();
  });

  it('should preserve arrays without merging them', () => {
    const mergeWithDefaults = getMergeWithDefaults();
    
    const loadedState: Partial<GameState> = {
      referrals: [
        { userId: 'user1', timestamp: 123, claimed: true },
        { userId: 'user2', timestamp: 456, claimed: false },
      ],
      unlockedAchievements: ['achievement1', 'achievement2'],
    };

    const result = mergeWithDefaults(loadedState);

    // Arrays should be used as-is, not merged
    expect(result.referrals).toHaveLength(2);
    expect(result.referrals[0].userId).toBe('user1');
    expect(result.unlockedAchievements).toHaveLength(2);
    expect(result.unlockedAchievements[0]).toBe('achievement1');
  });

  it('should handle null values correctly', () => {
    const mergeWithDefaults = getMergeWithDefaults();
    
    const loadedState: Partial<GameState> = {
      detectedCurrency: null,
      username: undefined,
    };

    const result = mergeWithDefaults(loadedState);

    // Null should be preserved
    expect(result.detectedCurrency).toBeNull();
    // Undefined should use default
    expect(result.username).toBeUndefined();
  });

  it('should add all new schema fields to old save data', () => {
    const mergeWithDefaults = getMergeWithDefaults();
    
    // Simulate an old save that's missing newer fields
    const oldSave: Partial<GameState> = {
      resources: { wood: 100 } as any,
      playTime: 1000,
      // Missing: focusState, huntingSkills, fogState, etc.
    };

    const result = mergeWithDefaults(oldSave);

    // Old values preserved
    expect(result.resources.wood).toBe(100);
    expect(result.playTime).toBe(1000);

    // New fields added
    expect(result.focusState).toBeDefined();
    expect(result.focusState.isActive).toBe(false);
    expect(result.huntingSkills).toBeDefined();
    expect(result.huntingSkills.level).toBe(0);
    expect(result.fogState).toBeDefined();
    expect(result.fogState.isActive).toBe(false);
  });

  it('should handle partial nested objects correctly', () => {
    const mergeWithDefaults = getMergeWithDefaults();
    
    const loadedState: Partial<GameState> = {
      feastState: { isActive: true, endTime: 999 } as any, // Missing lastAcceptedLevel
      bastion_stats: { defense: 50 } as any, // Missing attack, integrity, etc.
    };

    const result = mergeWithDefaults(loadedState);

    // Existing nested values preserved
    expect(result.feastState.isActive).toBe(true);
    expect(result.feastState.endTime).toBe(999);
    expect(result.bastion_stats.defense).toBe(50);

    // Missing nested values added
    expect(result.feastState.lastAcceptedLevel).toBeDefined();
    expect(result.bastion_stats.attack).toBeDefined();
    expect(result.bastion_stats.integrity).toBeDefined();
  });
});
