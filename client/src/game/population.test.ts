
import { describe, it, expect } from 'vitest';
import { getPopulationProduction, getTotalPopulationEffects } from './population';
import { GameState } from '@shared/schema';

// Helper to create a minimal test state
const createTestState = (overrides?: Partial<GameState>): GameState => {
  return {
    resources: {
      wood: 1000,
      stone: 1000,
      food: 1000,
      iron: 1000,
      coal: 1000,
      steel: 1000,
      sulfur: 1000,
      obsidian: 1000,
      adamant: 1000,
      silver: 1000,
      gold: 1000,
      fur: 1000,
      bones: 1000,
      leather: 1000,
      torch: 100,
      bone_totem: 100,
      leather_totem: 100,
      ember_bomb: 10,
      ashfire_bomb: 10,
      void_bomb: 10,
      poison_arrows: 10,
      black_powder: 100,
      ashfire_dust: 100,
      moonstone: 100,
      bloodstone: 0,
    },
    buildings: {
      woodenHut: 0,
      cabin: 0,
      blacksmith: 0,
      shallowPit: 0,
      deepeningPit: 0,
      deepPit: 0,
      bottomlessPit: 0,
      foundry: 0,
      primeFoundry: 0,
      masterworkFoundry: 0,
      altar: 0,
      greatCabin: 0,
      timberMill: 0,
      quarry: 0,
      clerksHut: 1,
      tannery: 0,
      masterTannery: 0,
      shrine: 0,
      temple: 0,
      sanctum: 0,
      alchemistHall: 0,
      tradePost: 0,
      grandBazaar: 0,
      merchantsGuild: 0,
      bastion: 0,
      watchtower: 0,
      palisades: 0,
      stoneHut: 0,
      fortifiedMoat: 0,
      wizardTower: 0,
      longhouse: 0,
      grandBlacksmith: 0,
      furTents: 0,
      traps: 0,
      blackMonolith: 0,
      darkEstate: 0,
      pillarOfClarity: 0,
      boneTemple: 0,
      scriptorium: 0,
      inkwardenAcademy: 0,
    },
    tools: {
      stone_axe: false,
      stone_pickaxe: false,
      iron_axe: false,
      iron_pickaxe: false,
      steel_axe: false,
      steel_pickaxe: false,
      obsidian_axe: false,
      obsidian_pickaxe: false,
      adamant_axe: false,
      adamant_pickaxe: false,
      iron_lantern: false,
      steel_lantern: false,
      obsidian_lantern: false,
      adamant_lantern: false,
      explorer_pack: false,
      blacksmith_hammer: false,
      giant_trap: false,
      reinforced_rope: false,
      occultist_map: false,
      mastermason_chisel: false,
      bone_saw: false,
    },
    weapons: {
      iron_sword: false,
      steel_sword: false,
      obsidian_sword: false,
      adamant_sword: false,
      crude_bow: false,
      huntsman_bow: false,
      long_bow: false,
      war_bow: false,
      master_bow: false,
      frostglass_sword: false,
      arbalest: false,
      nightshade_bow: false,
      bloodstone_staff: false,
    },
    clothing: {
      tarnished_amulet: false,
      bloodstained_belt: false,
      explorer_pack: false,
      hunter_cloak: false,
      grenadier_bag: false,
      highpriest_robe: false,
      loggers_gloves: false,
      red_mask: false,
      ring_of_clarity: false,
      moon_bracelet: false,
      black_bear_fur: false,
      ring_of_drowned: false,
      ebony_ring: false,
    },
    relics: {
      old_trinket: false,
      bone_dice: false,
      shadow_flute: false,
      hollow_king_scepter: false,
      ravens_orb: false,
      ancient_scrolls: false,
      frostglass: false,
      bloodstone: false,
      occultist_grimoire: false,
    },
    schematics: {
      arbalest_schematic: false,
      nightshade_bow_schematic: false,
    },
    books: {
      book_of_ascension: false,
    },
    blessings: {},
    villagers: {
      free: 5,
      gatherer: 0,
      hunter: 0,
      iron_miner: 0,
      coal_miner: 0,
      sulfur_miner: 0,
      obsidian_miner: 0,
      adamant_miner: 0,
      moonstone_miner: 0,
      steel_forger: 0,
      tanner: 0,
      powder_maker: 0,
      ashfire_dust_maker: 0,
    },
    flags: {
      gameStarted: true,
      villageUnlocked: true,
      forestUnlocked: true,
      caveExplored: true,
      venturedDeeper: true,
      descendedFurther: true,
      exploredRuins: true,
      exploredTemple: true,
      exploredCitadel: true,
      bastionUnlocked: false,
      portalBlasted: false,
      lowChamberExplored: false,
      occultistChamberExplored: false,
      humanSacrificeUnlocked: false,
      monolithUnlocked: false,
      starvationActive: false,
    },
    story: {
      seen: {},
    },
    stats: {
      strength: 0,
      luck: 0,
      knowledge: 0,
      madness: 0,
      madnessFromEvents: 0,
    },
    cooldowns: {},
    events: {},
    log: [],
    current_population: 5,
    max_population: 10,
    devMode: false,
    boostMode: false,
    cruelMode: false,
    CM: 0,
    feastState: { isActive: false, endTime: 0, lastAcceptedLevel: 0 },
    greatFeastState: { isActive: false, endTime: 0 },
    curseState: { isActive: false, endTime: 0 },
    miningBoostState: { isActive: false, endTime: 0 },
    frostfallState: { isActive: false, endTime: 0 },
    combatSkills: {},
    buttonUpgrades: {},
    sacrifices: {},
    activeEffects: {},
    madness: 0,
    effects: {
      resource_bonus: {},
      resource_multiplier: {},
      probability_bonus: {},
      cooldown_reduction: {},
    },
    bastion_stats: {
      defense: 0,
      attack: 0,
      integrity: 0,
    },
    hoveredTooltips: {},
    fellowship: {},
    attackWaveTimers: {},
    cooldownDurations: {},
    sleepUpgrades: {
      lengthLevel: 0,
      intensityLevel: 0,
    },
    activatedPurchases: {},
    greatFeastActivations: 0,
    referrals: [],
    social_media_rewards: {},
    ...overrides,
  } as GameState;
};

describe('Population Production Display Tests', () => {
  describe('Gatherer production matches display', () => {
    it('single gatherer production matches displayed value', () => {
      const state = createTestState({
        villagers: { ...createTestState().villagers, gatherer: 1, free: 4 },
        buildings: { ...createTestState().buildings, timberMill: 0 },
      });

      // Get actual production from loop
      const actualProduction = getPopulationProduction('gatherer', 1, state);
      
      // Get displayed production (what VillagePanel shows)
      const displayedEffects = getTotalPopulationEffects(state, ['gatherer']);

      // Verify each resource matches
      actualProduction.forEach(prod => {
        expect(displayedEffects[prod.resource]).toBe(prod.totalAmount);
      });
    });

    it('multiple gatherers production matches displayed value', () => {
      const state = createTestState({
        villagers: { ...createTestState().villagers, gatherer: 5, free: 0 },
      });

      const actualProduction = getPopulationProduction('gatherer', 5, state);
      const displayedEffects = getTotalPopulationEffects(state, ['gatherer']);

      actualProduction.forEach(prod => {
        expect(displayedEffects[prod.resource]).toBe(prod.totalAmount);
      });
    });

    it('gatherer with timber mill bonus matches display', () => {
      const state = createTestState({
        villagers: { ...createTestState().villagers, gatherer: 3, free: 2 },
        buildings: { ...createTestState().buildings, timberMill: 1 },
      });

      const actualProduction = getPopulationProduction('gatherer', 3, state);
      const displayedEffects = getTotalPopulationEffects(state, ['gatherer']);

      actualProduction.forEach(prod => {
        expect(displayedEffects[prod.resource]).toBe(prod.totalAmount);
      });
    });
  });

  describe('Hunter production matches display', () => {
    it('single hunter production matches displayed value', () => {
      const state = createTestState({
        villagers: { ...createTestState().villagers, hunter: 1, free: 4 },
        buildings: { ...createTestState().buildings, cabin: 1 },
      });

      const actualProduction = getPopulationProduction('hunter', 1, state);
      const displayedEffects = getTotalPopulationEffects(state, ['hunter']);

      actualProduction.forEach(prod => {
        expect(displayedEffects[prod.resource]).toBe(prod.totalAmount);
      });
    });

    it('multiple hunters production matches displayed value', () => {
      const state = createTestState({
        villagers: { ...createTestState().villagers, hunter: 4, free: 1 },
        buildings: { ...createTestState().buildings, cabin: 1 },
      });

      const actualProduction = getPopulationProduction('hunter', 4, state);
      const displayedEffects = getTotalPopulationEffects(state, ['hunter']);

      actualProduction.forEach(prod => {
        expect(displayedEffects[prod.resource]).toBe(prod.totalAmount);
      });
    });
  });

  describe('Miner production matches display', () => {
    it('iron miner production matches displayed value', () => {
      const state = createTestState({
        villagers: { ...createTestState().villagers, iron_miner: 2, free: 3 },
        buildings: { ...createTestState().buildings, shallowPit: 1 },
      });

      const actualProduction = getPopulationProduction('iron_miner', 2, state);
      const displayedEffects = getTotalPopulationEffects(state, ['iron_miner']);

      actualProduction.forEach(prod => {
        expect(displayedEffects[prod.resource]).toBe(prod.totalAmount);
      });
    });

    it('coal miner production matches displayed value', () => {
      const state = createTestState({
        villagers: { ...createTestState().villagers, coal_miner: 2, free: 3 },
        buildings: { ...createTestState().buildings, shallowPit: 1 },
      });

      const actualProduction = getPopulationProduction('coal_miner', 2, state);
      const displayedEffects = getTotalPopulationEffects(state, ['coal_miner']);

      actualProduction.forEach(prod => {
        expect(displayedEffects[prod.resource]).toBe(prod.totalAmount);
      });
    });

    it('steel forger production matches displayed value', () => {
      const state = createTestState({
        villagers: { ...createTestState().villagers, steel_forger: 1, free: 4 },
        buildings: { ...createTestState().buildings, foundry: 1 },
        resources: { ...createTestState().resources, iron: 500, coal: 500 },
      });

      const actualProduction = getPopulationProduction('steel_forger', 1, state);
      const displayedEffects = getTotalPopulationEffects(state, ['steel_forger']);

      actualProduction.forEach(prod => {
        expect(displayedEffects[prod.resource]).toBe(prod.totalAmount);
      });
    });
  });

  describe('Mixed job production matches display', () => {
    it('multiple different jobs match displayed totals', () => {
      const state = createTestState({
        villagers: {
          ...createTestState().villagers,
          gatherer: 2,
          hunter: 1,
          iron_miner: 1,
          coal_miner: 1,
          free: 0,
        },
        buildings: {
          ...createTestState().buildings,
          cabin: 1,
          shallowPit: 1,
        },
      });

      const jobIds = ['gatherer', 'hunter', 'iron_miner', 'coal_miner'];
      const displayedEffects = getTotalPopulationEffects(state, jobIds);

      // Calculate actual totals from loop
      const actualTotals: Record<string, number> = {};
      jobIds.forEach(jobId => {
        const count = state.villagers[jobId as keyof typeof state.villagers] || 0;
        if (count > 0) {
          const production = getPopulationProduction(jobId, count, state);
          production.forEach(prod => {
            actualTotals[prod.resource] = (actualTotals[prod.resource] || 0) + prod.totalAmount;
          });
        }
      });

      // Verify displayed matches actual
      Object.entries(displayedEffects).forEach(([resource, amount]) => {
        expect(actualTotals[resource]).toBe(amount);
      });
    });

    it('all job types together match displayed totals', () => {
      const state = createTestState({
        villagers: {
          free: 0,
          gatherer: 2,
          hunter: 2,
          iron_miner: 1,
          coal_miner: 1,
          sulfur_miner: 1,
          obsidian_miner: 1,
          adamant_miner: 1,
          moonstone_miner: 1,
          steel_forger: 1,
          tanner: 1,
          powder_maker: 0,
          ashfire_dust_maker: 0,
        },
        buildings: {
          ...createTestState().buildings,
          cabin: 1,
          shallowPit: 1,
          deepeningPit: 1,
          deepPit: 1,
          bottomlessPit: 1,
          foundry: 1,
          tannery: 1,
        },
      });

      const jobIds = [
        'gatherer',
        'hunter',
        'iron_miner',
        'coal_miner',
        'sulfur_miner',
        'obsidian_miner',
        'adamant_miner',
        'moonstone_miner',
        'steel_forger',
        'tanner',
      ];

      const displayedEffects = getTotalPopulationEffects(state, jobIds);

      // Calculate actual totals
      const actualTotals: Record<string, number> = {};
      jobIds.forEach(jobId => {
        const count = state.villagers[jobId as keyof typeof state.villagers] || 0;
        if (count > 0) {
          const production = getPopulationProduction(jobId, count, state);
          production.forEach(prod => {
            actualTotals[prod.resource] = (actualTotals[prod.resource] || 0) + prod.totalAmount;
          });
        }
      });

      // Verify displayed matches actual
      Object.entries(displayedEffects).forEach(([resource, amount]) => {
        expect(actualTotals[resource]).toBe(amount);
      });
    });
  });

  describe('Production with feast active', () => {
    it('gatherer production with feast matches display', () => {
      const state = createTestState({
        villagers: { ...createTestState().villagers, gatherer: 3, free: 2 },
        feastState: { isActive: true, endTime: Date.now() + 10000, lastAcceptedLevel: 0 },
      });

      const actualProduction = getPopulationProduction('gatherer', 3, state);
      const displayedEffects = getTotalPopulationEffects(state, ['gatherer']);

      actualProduction.forEach(prod => {
        expect(displayedEffects[prod.resource]).toBe(prod.totalAmount);
      });
    });

    it('hunter production with great feast matches display', () => {
      const state = createTestState({
        villagers: { ...createTestState().villagers, hunter: 2, free: 3 },
        buildings: { ...createTestState().buildings, cabin: 1 },
        greatFeastState: { isActive: true, endTime: Date.now() + 10000 },
      });

      const actualProduction = getPopulationProduction('hunter', 2, state);
      const displayedEffects = getTotalPopulationEffects(state, ['hunter']);

      actualProduction.forEach(prod => {
        expect(displayedEffects[prod.resource]).toBe(prod.totalAmount);
      });
    });
  });

  describe('Production with mining boost', () => {
    it('iron miner with mining boost matches display', () => {
      const state = createTestState({
        villagers: { ...createTestState().villagers, iron_miner: 2, free: 3 },
        buildings: { ...createTestState().buildings, shallowPit: 1 },
        miningBoostState: { isActive: true, endTime: Date.now() + 10000 },
      });

      const actualProduction = getPopulationProduction('iron_miner', 2, state);
      const displayedEffects = getTotalPopulationEffects(state, ['iron_miner']);

      actualProduction.forEach(prod => {
        expect(displayedEffects[prod.resource]).toBe(prod.totalAmount);
      });
    });

    it('all miners with mining boost match display', () => {
      const state = createTestState({
        villagers: {
          ...createTestState().villagers,
          iron_miner: 1,
          coal_miner: 1,
          sulfur_miner: 1,
          obsidian_miner: 1,
          adamant_miner: 1,
          moonstone_miner: 1,
          free: 0,
        },
        buildings: {
          ...createTestState().buildings,
          shallowPit: 1,
          deepeningPit: 1,
          deepPit: 1,
          bottomlessPit: 1,
        },
        miningBoostState: { isActive: true, endTime: Date.now() + 10000 },
      });

      const jobIds = ['iron_miner', 'coal_miner', 'sulfur_miner', 'obsidian_miner', 'adamant_miner', 'moonstone_miner'];
      const displayedEffects = getTotalPopulationEffects(state, jobIds);

      const actualTotals: Record<string, number> = {};
      jobIds.forEach(jobId => {
        const count = state.villagers[jobId as keyof typeof state.villagers] || 0;
        if (count > 0) {
          const production = getPopulationProduction(jobId, count, state);
          production.forEach(prod => {
            actualTotals[prod.resource] = (actualTotals[prod.resource] || 0) + prod.totalAmount;
          });
        }
      });

      Object.entries(displayedEffects).forEach(([resource, amount]) => {
        expect(actualTotals[resource]).toBe(amount);
      });
    });
  });
});
