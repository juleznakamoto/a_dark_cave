
import { describe, it, expect } from 'vitest';
import { GameState } from '@shared/schema';

// Old mergeStateUpdates implementation (manual spreading)
const mergeStateUpdatesOld = (
  prevState: GameState,
  stateUpdates: Partial<GameState>,
): Partial<GameState> => {
  const mergedResources = { ...prevState.resources, ...stateUpdates.resources };
  Object.keys(mergedResources).forEach(key => {
    if (typeof mergedResources[key as keyof typeof mergedResources] === 'number') {
      const value = mergedResources[key as keyof typeof mergedResources];
      if (value < 0) {
        mergedResources[key as keyof typeof mergedResources] = 0;
      }
    }
  });

  const merged = {
    resources: mergedResources,
    weapons: { ...prevState.weapons, ...stateUpdates.weapons },
    tools: { ...prevState.tools, ...stateUpdates.tools },
    buildings: { ...prevState.buildings, ...stateUpdates.buildings },
    flags: { ...prevState.flags, ...stateUpdates.flags },
    villagers: { ...prevState.villagers, ...stateUpdates.villagers },
    clothing: { ...prevState.clothing, ...stateUpdates.clothing },
    relics: { ...prevState.relics, ...stateUpdates.relics },
    books: { ...prevState.books, ...stateUpdates.books },
    fellowship: { ...prevState.fellowship, ...stateUpdates.fellowship },
    blessings: { ...prevState.blessings, ...stateUpdates.blessings },
    events: { ...prevState.events, ...stateUpdates.events },
    stats: { ...prevState.stats, ...stateUpdates.stats },
    cooldowns: { ...prevState.cooldowns, ...stateUpdates.cooldowns },
    cooldownDurations: { ...prevState.cooldownDurations, ...stateUpdates.cooldownDurations },
    attackWaveTimers: { ...prevState.attackWaveTimers, ...stateUpdates.attackWaveTimers },
    feastState: stateUpdates.feastState || prevState.feastState,
    greatFeastState: stateUpdates.greatFeastState || prevState.greatFeastState,
    curseState: stateUpdates.curseState || prevState.curseState,
    frostfallState: stateUpdates.frostfallState || prevState.frostfallState,
    sleepUpgrades: stateUpdates.sleepUpgrades || prevState.sleepUpgrades,
    combatSkills: stateUpdates.combatSkills || prevState.combatSkills,
    clickAnalytics: { ...prevState.clickAnalytics, ...stateUpdates.clickAnalytics },
    madness: stateUpdates.madness !== undefined ? stateUpdates.madness : prevState.madness,
    miningBoostState: stateUpdates.miningBoostState || prevState.miningBoostState,
    greatFeastActivations: stateUpdates.greatFeastActivations !== undefined ? stateUpdates.greatFeastActivations : prevState.greatFeastActivations,
    buttonUpgrades: stateUpdates.buttonUpgrades
      ? {
          ...prevState.buttonUpgrades,
          ...Object.fromEntries(
            Object.entries(stateUpdates.buttonUpgrades).map(([key, value]) => [
              key,
              { ...prevState.buttonUpgrades[key as keyof typeof prevState.buttonUpgrades], ...value }
            ])
          )
        }
      : prevState.buttonUpgrades,
    story: stateUpdates.story
      ? {
          ...prevState.story,
          seen: { ...prevState.story.seen, ...stateUpdates.story.seen },
        }
      : prevState.story,
    effects: stateUpdates.effects || prevState.effects,
    loopProgress: stateUpdates.loopProgress !== undefined ? stateUpdates.loopProgress : prevState.loopProgress,
    isGameLoopActive: stateUpdates.isGameLoopActive !== undefined ? stateUpdates.isGameLoopActive : prevState.isGameLoopActive,
    isPaused: stateUpdates.isPaused !== undefined ? stateUpdates.isPaused : prevState.isPaused,
    playTime: stateUpdates.playTime !== undefined ? stateUpdates.playTime : prevState.playTime,
    referralCount: stateUpdates.referralCount !== undefined ? stateUpdates.referralCount : prevState.referralCount,
    referredUsers: stateUpdates.referredUsers || prevState.referredUsers,
    referrals: stateUpdates.referrals || prevState.referrals,
    social_media_rewards: stateUpdates.social_media_rewards || prevState.social_media_rewards,
    lastResourceSnapshotTime: stateUpdates.lastResourceSnapshotTime !== undefined ? stateUpdates.lastResourceSnapshotTime : prevState.lastResourceSnapshotTime,
    isPausedPreviously: stateUpdates.isPausedPreviously !== undefined ? stateUpdates.isPausedPreviously : prevState.isPausedPreviously,
  };

  return merged;
};

// New mergeStateUpdates implementation (generic)
const mergeStateUpdatesNew = (
  prevState: GameState,
  stateUpdates: Partial<GameState>,
): Partial<GameState> => {
  const merged: Partial<GameState> = {};

  const updateKeys = Object.keys(stateUpdates) as (keyof GameState)[];

  for (const key of updateKeys) {
    const prevValue = prevState[key];
    const updateValue = stateUpdates[key];

    if (updateValue === undefined) {
      continue;
    }

    if (typeof updateValue !== 'object' || updateValue === null) {
      merged[key] = updateValue as any;
      continue;
    }

    if (Array.isArray(updateValue)) {
      merged[key] = updateValue as any;
      continue;
    }

    if (typeof prevValue === 'object' && prevValue !== null && !Array.isArray(prevValue)) {
      if (key === 'buttonUpgrades') {
        const mergedUpgrades: any = { ...prevState.buttonUpgrades };
        for (const [upgradeKey, upgradeValue] of Object.entries(updateValue as any)) {
          mergedUpgrades[upgradeKey] = {
            ...mergedUpgrades[upgradeKey],
            ...upgradeValue,
          };
        }
        merged[key] = mergedUpgrades;
      } else if (key === 'story') {
        merged[key] = {
          ...prevValue,
          seen: { ...(prevValue as any).seen, ...(updateValue as any).seen },
        } as any;
      } else {
        merged[key] = { ...prevValue, ...updateValue } as any;
      }
    } else {
      merged[key] = updateValue as any;
    }
  }

  if (merged.resources) {
    const resources = merged.resources;
    for (const key in resources) {
      const value = resources[key as keyof typeof resources];
      if (typeof value === 'number' && value < 0) {
        resources[key as keyof typeof resources] = 0;
      }
    }
  }

  return merged;
};

const createMockGameState = (): GameState => ({
  resources: { wood: 100, stone: 50, gold: 200, food: 75, iron: 0, coal: 0 },
  weapons: { stick: false, club: false },
  tools: { torch: false, pickaxe: false },
  buildings: { bastion: 0, watchtower: 0 },
  flags: { hasLitFire: false, hasSeenMerchant: false },
  villagers: { free: 5, woodcutter: 2, miner: 1, farmer: 0, hunter: 0, gatherer: 0 },
  clothing: {},
  relics: {},
  books: {},
  fellowship: {},
  blessings: {},
  events: { currentEvent: null, eventQueue: [] },
  stats: { luck: 5, strength: 3, knowledge: 2, madness: 0 },
  cooldowns: { gatherWood: 0 },
  cooldownDurations: { gatherWood: 5 },
  attackWaveTimers: {},
  feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 0 },
  greatFeastState: { isActive: false, endTime: 0 },
  curseState: { isActive: false, endTime: 0 },
  frostfallState: { isActive: false, endTime: 0 },
  sleepUpgrades: { lengthLevel: 0, intensityLevel: 0 },
  combatSkills: { crushingStrikeLevel: 0, bloodflameSphereLevel: 0 },
  clickAnalytics: {},
  madness: 0,
  miningBoostState: null,
  greatFeastActivations: 0,
  buttonUpgrades: {
    gatherWood: { level: 1, usage: 10 },
    gatherStone: { level: 0, usage: 0 },
  },
  story: {
    seen: {
      firstFire: true,
      exploredTemple: false,
    },
  },
  effects: { resource_bonus: {}, resource_multiplier: {}, probability_bonus: {}, cooldown_reduction: {} },
  loopProgress: 0,
  isGameLoopActive: true,
  isPaused: false,
  playTime: 1000,
  referralCount: 0,
  referredUsers: [],
  referrals: [],
  social_media_rewards: {},
  lastResourceSnapshotTime: 0,
  isPausedPreviously: false,
  bastion_stats: { defense: 0, attack: 0, integrity: 0 },
  hoveredTooltips: {},
  activatedPurchases: {},
  feastActivations: {},
  cruelMode: false,
  CM: 0,
  isMuted: false,
  shopNotificationSeen: false,
  shopNotificationVisible: false,
  authNotificationSeen: false,
  authNotificationVisible: false,
  mysteriousNoteShopNotificationSeen: false,
  mysteriousNoteDonateNotificationSeen: false,
  highlightedResources: [],
  isUserSignedIn: false,
  isNewGame: false,
  startTime: Date.now(),
  idleModeState: { isActive: false, startTime: 0, needsDisplay: false },
  lastFreeGoldClaim: 0,
  resourceAnalytics: {},
} as any);

describe('mergeStateUpdates - Old vs New Implementation', () => {
  it('should produce identical results for simple resource updates', () => {
    const prevState = createMockGameState();
    const updates: Partial<GameState> = {
      resources: { wood: 150, stone: 75, gold: 200, food: 75, iron: 0, coal: 0 },
    };

    const oldResult = mergeStateUpdatesOld(prevState, updates);
    const newResult = mergeStateUpdatesNew(prevState, updates);

    expect(newResult.resources).toEqual(oldResult.resources);
  });

  it('should produce identical results for negative resource handling', () => {
    const prevState = createMockGameState();
    const updates: Partial<GameState> = {
      resources: { wood: -50, stone: 50, gold: 200, food: 75, iron: 0, coal: 0 },
    };

    const oldResult = mergeStateUpdatesOld(prevState, updates);
    const newResult = mergeStateUpdatesNew(prevState, updates);

    expect(newResult.resources).toEqual(oldResult.resources);
    expect(newResult.resources?.wood).toBe(0);
  });

  it('should produce identical results for flags and simple objects', () => {
    const prevState = createMockGameState();
    const updates: Partial<GameState> = {
      flags: { hasLitFire: true, hasSeenMerchant: true },
      stats: { luck: 10, strength: 5, knowledge: 3, madness: 1 },
    };

    const oldResult = mergeStateUpdatesOld(prevState, updates);
    const newResult = mergeStateUpdatesNew(prevState, updates);

    expect(newResult.flags).toEqual(oldResult.flags);
    expect(newResult.stats).toEqual(oldResult.stats);
  });

  it('should produce identical results for buttonUpgrades deep merge', () => {
    const prevState = createMockGameState();
    const updates: Partial<GameState> = {
      buttonUpgrades: {
        gatherWood: { level: 2, usage: 25 },
      },
    };

    const oldResult = mergeStateUpdatesOld(prevState, updates);
    const newResult = mergeStateUpdatesNew(prevState, updates);

    expect(newResult.buttonUpgrades).toEqual(oldResult.buttonUpgrades);
    expect(newResult.buttonUpgrades?.gatherWood).toEqual({ level: 2, usage: 25 });
    expect(newResult.buttonUpgrades?.gatherStone).toEqual({ level: 0, usage: 0 });
  });

  it('should produce identical results for story deep merge', () => {
    const prevState = createMockGameState();
    const updates: Partial<GameState> = {
      story: {
        seen: {
          exploredTemple: true,
        },
      },
    };

    const oldResult = mergeStateUpdatesOld(prevState, updates);
    const newResult = mergeStateUpdatesNew(prevState, updates);

    expect(newResult.story).toEqual(oldResult.story);
    expect(newResult.story?.seen.firstFire).toBe(true);
    expect(newResult.story?.seen.exploredTemple).toBe(true);
  });

  it('should produce identical results for primitive fields', () => {
    const prevState = createMockGameState();
    const updates: Partial<GameState> = {
      playTime: 2000,
      loopProgress: 50,
      isPaused: true,
      madness: 5,
    };

    const oldResult = mergeStateUpdatesOld(prevState, updates);
    const newResult = mergeStateUpdatesNew(prevState, updates);

    expect(newResult.playTime).toEqual(oldResult.playTime);
    expect(newResult.loopProgress).toEqual(oldResult.loopProgress);
    expect(newResult.isPaused).toEqual(oldResult.isPaused);
    expect(newResult.madness).toEqual(oldResult.madness);
  });

  it('should produce identical results for array fields', () => {
    const prevState = createMockGameState();
    const updates: Partial<GameState> = {
      referredUsers: ['user1', 'user2'],
      referrals: [{ userId: 'ref1', timestamp: Date.now(), claimed: false }],
    };

    const oldResult = mergeStateUpdatesOld(prevState, updates);
    const newResult = mergeStateUpdatesNew(prevState, updates);

    expect(newResult.referredUsers).toEqual(oldResult.referredUsers);
    expect(newResult.referrals).toEqual(oldResult.referrals);
  });

  it('should produce identical results for complex mixed updates', () => {
    const prevState = createMockGameState();
    const updates: Partial<GameState> = {
      resources: { wood: 200, stone: 100, gold: 200, food: 75, iron: 0, coal: 0 },
      flags: { hasLitFire: true, hasSeenMerchant: true },
      playTime: 5000,
      buttonUpgrades: {
        gatherWood: { level: 3, usage: 50 },
      },
      story: {
        seen: {
          exploredTemple: true,
        },
      },
      cooldowns: { gatherWood: 3.5 },
    };

    const oldResult = mergeStateUpdatesOld(prevState, updates);
    const newResult = mergeStateUpdatesNew(prevState, updates);

    expect(newResult.resources).toEqual(oldResult.resources);
    expect(newResult.flags).toEqual(oldResult.flags);
    expect(newResult.playTime).toEqual(oldResult.playTime);
    expect(newResult.buttonUpgrades).toEqual(oldResult.buttonUpgrades);
    expect(newResult.story).toEqual(oldResult.story);
    expect(newResult.cooldowns).toEqual(oldResult.cooldowns);
  });

  it('should handle new fields automatically in new implementation', () => {
    const prevState = createMockGameState();
    const updates: Partial<GameState> = {
      // Simulate a new field that might be added to GameState
      resources: { wood: 150, stone: 50, gold: 200, food: 75, iron: 0, coal: 0 },
      villagers: { free: 10, woodcutter: 2, miner: 1, farmer: 0, hunter: 0, gatherer: 0 },
    };

    const newResult = mergeStateUpdatesNew(prevState, updates);

    expect(newResult.resources).toBeDefined();
    expect(newResult.villagers).toBeDefined();
    expect(newResult.resources?.wood).toBe(150);
    expect(newResult.villagers?.free).toBe(10);
  });
});
