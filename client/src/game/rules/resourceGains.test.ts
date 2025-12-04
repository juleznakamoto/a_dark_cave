import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '@shared/schema';
import { applyActionEffects, gameActions } from './index';
import { getResourceGainTooltip, calculateResourceGains } from './tooltips';
import { getActionBonuses } from './effectsCalculation';

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
      clerksHut: 1, // Enable tooltips
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
    ...overrides,
  } as GameState;
};

// Helper to parse tooltip gains
const parseTooltipGains = (tooltipContent: React.ReactNode): Record<string, { min: number; max: number }> => {
  const gains: Record<string, { min: number; max: number }> = {};

  if (!tooltipContent) return gains;

  // Convert React nodes to text
  const getText = (node: any): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(getText).join('');
    if (node?.props?.children) return getText(node.props.children);
    return '';
  };

  const text = getText(tooltipContent);
  const lines = text.split('\n');

  lines.forEach(line => {
    // Match "+10-20 Wood" or "+15 Stone" patterns
    const rangeMatch = line.match(/\+(\d+)-(\d+)\s+(.+)/);
    const fixedMatch = line.match(/\+(\d+)\s+(.+)/);

    if (rangeMatch) {
      const [, min, max, resource] = rangeMatch;
      gains[resource.toLowerCase().replace(/\s+/g, '_')] = { 
        min: parseInt(min), 
        max: parseInt(max) 
      };
    } else if (fixedMatch) {
      const [, amount, resource] = fixedMatch;
      gains[resource.toLowerCase().replace(/\s+/g, '_')] = { 
        min: parseInt(amount), 
        max: parseInt(amount) 
      };
    }
  });

  return gains;
};

// Helper to run action multiple times and check if actual gains fall within tooltip range
const testActionGains = (actionId: string, state: GameState, iterations = 100) => {
  // Get expected range from calculation
  const { gains } = calculateResourceGains(actionId, state);

  let expectedMin = 0;
  let expectedMax = 0;

  if (gains.length > 0) {
    expectedMin = gains[0].min;
    expectedMax = gains[0].max;
  }


  const actualGains: Record<string, number[]> = {};

  // Run action multiple times to sample the random range
  for (let i = 0; i < iterations; i++) {
    const effectUpdates = applyActionEffects(actionId, state);

    if (effectUpdates.resources) {
      Object.entries(effectUpdates.resources).forEach(([resource, newValue]) => {
        const oldValue = state.resources[resource as keyof typeof state.resources] || 0;
        const gain = (newValue as number) - oldValue;

        if (gain > 0) {
          if (!actualGains[resource]) {
            actualGains[resource] = [];
          }
          actualGains[resource].push(gain);
        }
      });
    }
  }

  // Return expected gains and sampled actual gains
  const expectedGains: Record<string, {min: number, max: number}> = {};
  if (gains.length > 0) {
    expectedGains[gains[0].resource] = { min: expectedMin, max: expectedMax };
  }
  
  return { expectedGains, actualGains };
};

describe('Resource Gain Tests', () => {
  describe('Cave Exploration Actions', () => {
    it('chopWood gains match tooltip', () => {
      const state = createTestState();
      const { expectedGains, actualGains } = testActionGains('chopWood', state);

      expect(expectedGains.wood).toBeDefined();
      expect(actualGains.wood).toBeDefined();

      const minActual = Math.min(...actualGains.wood);
      const maxActual = Math.max(...actualGains.wood);

      expect(minActual).toBeGreaterThanOrEqual(expectedGains.wood.min);
      expect(maxActual).toBeLessThanOrEqual(expectedGains.wood.max);
    });

    it('exploreCave gains match tooltip', () => {
      const state = createTestState({
        story: { seen: { actionCraftTorch: true } },
      });
      const { expectedGains, actualGains } = testActionGains('exploreCave', state);

      ['wood', 'stone', 'coal', 'iron'].forEach(resource => {
        if (expectedGains[resource]) {
          expect(actualGains[resource]).toBeDefined();
          const minActual = Math.min(...actualGains[resource]);
          const maxActual = Math.max(...actualGains[resource]);

          expect(minActual).toBeGreaterThanOrEqual(expectedGains[resource].min);
          expect(maxActual).toBeLessThanOrEqual(expectedGains[resource].max);
        }
      });
    });

    it('ventureDeeper gains match tooltip', () => {
      const state = createTestState({
        buildings: { blacksmith: 1, clerksHut: 1 },
      });
      const { expectedGains, actualGains } = testActionGains('ventureDeeper', state);

      ['stone', 'coal', 'iron', 'sulfur', 'silver'].forEach(resource => {
        if (expectedGains[resource]) {
          expect(actualGains[resource]).toBeDefined();
          const minActual = Math.min(...actualGains[resource]);
          const maxActual = Math.max(...actualGains[resource]);

          expect(minActual).toBeGreaterThanOrEqual(expectedGains[resource].min);
          expect(maxActual).toBeLessThanOrEqual(expectedGains[resource].max);
        }
      });
    });
  });

  describe('Mining Actions', () => {
    it('mineStone gains match tooltip', () => {
      const state = createTestState({
        tools: { stone_pickaxe: true },
      });
      const { expectedGains, actualGains } = testActionGains('mineStone', state);

      expect(expectedGains.stone).toBeDefined();
      expect(actualGains.stone).toBeDefined();

      const minActual = Math.min(...actualGains.stone);
      const maxActual = Math.max(...actualGains.stone);

      expect(minActual).toBeGreaterThanOrEqual(expectedGains.stone.min);
      expect(maxActual).toBeLessThanOrEqual(expectedGains.stone.max);
    });

    it('mineIron gains match tooltip', () => {
      const state = createTestState({
        tools: { stone_pickaxe: true },
      });
      const { expectedGains, actualGains } = testActionGains('mineIron', state);

      expect(expectedGains.iron).toBeDefined();
      expect(actualGains.iron).toBeDefined();

      const minActual = Math.min(...actualGains.iron);
      const maxActual = Math.max(...actualGains.iron);

      expect(minActual).toBeGreaterThanOrEqual(expectedGains.iron.min);
      expect(maxActual).toBeLessThanOrEqual(expectedGains.iron.max);
    });

    it('mineCoal gains match tooltip', () => {
      const state = createTestState({
        tools: { iron_pickaxe: true },
      });
      const { expectedGains, actualGains } = testActionGains('mineCoal', state);

      expect(expectedGains.coal).toBeDefined();
      expect(actualGains.coal).toBeDefined();

      const minActual = Math.min(...actualGains.coal);
      const maxActual = Math.max(...actualGains.coal);

      expect(minActual).toBeGreaterThanOrEqual(expectedGains.coal.min);
      expect(maxActual).toBeLessThanOrEqual(expectedGains.coal.max);
    });

    it('mineObsidian gains match tooltip', () => {
      const state = createTestState({
        tools: { steel_pickaxe: true },
      });
      const { expectedGains, actualGains } = testActionGains('mineObsidian', state);

      expect(expectedGains.obsidian).toBeDefined();
      expect(actualGains.obsidian).toBeDefined();

      const minActual = Math.min(...actualGains.obsidian);
      const maxActual = Math.max(...actualGains.obsidian);

      expect(minActual).toBeGreaterThanOrEqual(expectedGains.obsidian.min);
      expect(maxActual).toBeLessThanOrEqual(expectedGains.obsidian.max);
    });
  });

  describe('Hunting Actions', () => {
    it('hunt gains match tooltip', () => {
      const state = createTestState({
        flags: { forestUnlocked: true },
      });
      const { expectedGains, actualGains } = testActionGains('hunt', state);

      ['food', 'fur', 'bones'].forEach(resource => {
        if (expectedGains[resource]) {
          expect(actualGains[resource]).toBeDefined();
          const minActual = Math.min(...actualGains[resource]);
          const maxActual = Math.max(...actualGains[resource]);

          expect(minActual).toBeGreaterThanOrEqual(expectedGains[resource].min);
          expect(maxActual).toBeLessThanOrEqual(expectedGains[resource].max);
        }
      });
    });
  });

  describe('Actions with Item Bonuses', () => {
    it('chopWood with loggers_gloves applies correct bonus', () => {
      const stateWithoutGloves = createTestState();
      const stateWithGloves = createTestState({
        clothing: { ...stateWithoutGloves.clothing, loggers_gloves: true },
      });

      const { expectedGains: expectedWithout } = testActionGains('chopWood', stateWithoutGloves, 50);
      const { expectedGains: expectedWith } = testActionGains('chopWood', stateWithGloves, 50);

      // With gloves should have higher gains (30% multiplier)
      expect(expectedWith.wood.min).toBeGreaterThanOrEqual(Math.floor(expectedWithout.wood.min * 1.3));
      expect(expectedWith.wood.max).toBeGreaterThanOrEqual(Math.floor(expectedWithout.wood.max * 1.3));
    });

    it('mineStone with mastermason_chisel applies correct bonus', () => {
      const stateWithoutChisel = createTestState({
        tools: { stone_pickaxe: true },
      });
      const stateWithChisel = createTestState({
        tools: { stone_pickaxe: true, mastermason_chisel: true },
      });

      const { expectedGains: expectedWithout } = testActionGains('mineStone', stateWithoutChisel, 50);
      const { expectedGains: expectedWith } = testActionGains('mineStone', stateWithChisel, 50);

      // With chisel should have higher gains (25% multiplier)
      expect(expectedWith.stone.min).toBeGreaterThanOrEqual(Math.floor(expectedWithout.stone.min * 1.25));
      expect(expectedWith.stone.max).toBeGreaterThanOrEqual(Math.floor(expectedWithout.stone.max * 1.25));
    });

    it('hunt with hunter_cloak applies correct bonus', () => {
      const stateWithoutCloak = createTestState({
        flags: { forestUnlocked: true },
      });
      const stateWithCloak = createTestState({
        flags: { forestUnlocked: true },
        clothing: { ...stateWithoutCloak.clothing, hunter_cloak: true },
      });

      const { expectedGains: expectedWithout } = testActionGains('hunt', stateWithoutCloak, 50);
      const { expectedGains: expectedWith } = testActionGains('hunt', stateWithCloak, 50);

      // With cloak should have higher gains
      expect(expectedWith.food.min).toBeGreaterThan(expectedWithout.food.min);
      expect(expectedWith.food.max).toBeGreaterThan(expectedWithout.food.max);
    });
  });

  describe('Sacrifice Actions', () => {
    it('boneTotems gains match tooltip', () => {
      const state = createTestState({
        buildings: { altar: 1, clerksHut: 1 },
      });
      const { expectedGains, actualGains } = testActionGains('boneTotems', state);

      expect(expectedGains.silver).toBeDefined();
      expect(actualGains.silver).toBeDefined();

      const minActual = Math.min(...actualGains.silver);
      const maxActual = Math.max(...actualGains.silver);

      expect(minActual).toBeGreaterThanOrEqual(expectedGains.silver.min);
      expect(maxActual).toBeLessThanOrEqual(expectedGains.silver.max);
    });

    it('leatherTotems gains match tooltip', () => {
      const state = createTestState({
        buildings: { temple: 1, clerksHut: 1 },
      });
      const { expectedGains, actualGains } = testActionGains('leatherTotems', state);

      expect(expectedGains.gold).toBeDefined();
      expect(actualGains.gold).toBeDefined();

      const minActual = Math.min(...actualGains.gold);
      const maxActual = Math.max(...actualGains.gold);

      expect(minActual).toBeGreaterThanOrEqual(expectedGains.gold.min);
      expect(maxActual).toBeLessThanOrEqual(expectedGains.gold.max);
    });

    it('boneTotems with boneTemple applies 25% bonus', () => {
      const stateWithoutTemple = createTestState({
        buildings: { altar: 1, clerksHut: 1 },
      });
      const stateWithTemple = createTestState({
        buildings: { altar: 1, clerksHut: 1, boneTemple: 1 },
      });

      const { expectedGains: expectedWithout } = testActionGains('boneTotems', stateWithoutTemple, 50);
      const { expectedGains: expectedWith } = testActionGains('boneTotems', stateWithTemple, 50);

      // With temple should have approximately 25% higher gains (floor operation may reduce slightly)
      const expectedBonus = Math.floor(expectedWithout.silver.min * 1.25);
      expect(expectedWith.silver.min).toBeGreaterThanOrEqual(expectedBonus);
    });
  });

  describe('Button Upgrades', () => {
    it('chopWood with button upgrades increases gains', () => {
      const stateWithoutUpgrade = createTestState();
      const stateWithUpgrade = createTestState({
        books: { book_of_ascension: true },
        buttonUpgrades: { chopWood: 5 }, // Level 5 = 50% bonus
      });

      const { expectedGains: expectedWithout } = testActionGains('chopWood', stateWithoutUpgrade, 50);
      const { expectedGains: expectedWith } = testActionGains('chopWood', stateWithUpgrade, 50);

      // With upgrades should have significantly higher gains (at least 40% more accounting for floor rounding)
      expect(expectedWith.wood.min).toBeGreaterThanOrEqual(Math.floor(expectedWithout.wood.min * 1.4));
      expect(expectedWith.wood.max).toBeGreaterThanOrEqual(Math.floor(expectedWithout.wood.max * 1.4));
    });

    it('exploreCave with button upgrades increases gains', () => {
      const stateWithoutUpgrade = createTestState({
        story: { seen: { actionCraftTorch: true } },
      });
      const stateWithUpgrade = createTestState({
        story: { seen: { actionCraftTorch: true } },
        books: { book_of_ascension: true },
        buttonUpgrades: { exploreCave: 10 }, // Level 10 = 100% bonus
      });

      const { expectedGains: expectedWithout } = testActionGains('exploreCave', stateWithoutUpgrade, 50);
      const { expectedGains: expectedWith } = testActionGains('exploreCave', stateWithUpgrade, 50);

      // With max upgrades should have approximately double the gains (at least 90% more accounting for floor rounding)
      expect(expectedWith.wood.min).toBeGreaterThanOrEqual(Math.floor(expectedWithout.wood.min * 1.9));
    });
  });

  describe('Multiplier Stacking', () => {
    it('multiple bonuses stack correctly for chopWood', () => {
      const state = createTestState({
        clothing: { loggers_gloves: true },
        books: { book_of_ascension: true },
        buttonUpgrades: { chopWood: 5 },
      });

      const bonuses = getActionBonuses('chopWood', state);
      const { expectedGains, actualGains } = testActionGains('chopWood', state);

      expect(bonuses.resourceMultiplier).toBeGreaterThan(1);
      expect(actualGains.wood).toBeDefined();

      const minActual = Math.min(...actualGains.wood);
      const maxActual = Math.max(...actualGains.wood);

      expect(minActual).toBeGreaterThanOrEqual(expectedGains.wood.min);
      expect(maxActual).toBeLessThanOrEqual(expectedGains.wood.max);
    });

    it('multiple bonuses stack correctly for mining', () => {
      const state = createTestState({
        tools: { stone_pickaxe: true, mastermason_chisel: true },
        books: { book_of_ascension: true },
        buttonUpgrades: { mineStone: 3 },
      });

      const bonuses = getActionBonuses('mineStone', state);
      const { expectedGains, actualGains } = testActionGains('mineStone', state);

      expect(bonuses.resourceMultiplier).toBeGreaterThan(1);
      expect(actualGains.stone).toBeDefined();

      const minActual = Math.min(...actualGains.stone);
      const maxActual = Math.max(...actualGains.stone);

      expect(minActual).toBeGreaterThanOrEqual(expectedGains.stone.min);
      expect(maxActual).toBeLessThanOrEqual(expectedGains.stone.max);
    });
  });

  describe('Additional Cave Exploration', () => {
    it('exploreCitadel gains match tooltip', () => {
      const state = createTestState({
        tools: { adamant_lantern: true },
      });
      const { expectedGains, actualGains } = testActionGains('exploreCitadel', state);

      ['obsidian', 'adamant', 'moonstone', 'silver', 'gold'].forEach(resource => {
        if (expectedGains[resource]) {
          expect(actualGains[resource]).toBeDefined();
          const minActual = Math.min(...actualGains[resource]);
          const maxActual = Math.max(...actualGains[resource]);

          expect(minActual).toBeGreaterThanOrEqual(expectedGains[resource].min);
          expect(maxActual).toBeLessThanOrEqual(expectedGains[resource].max);
        }
      });
    });
  });

  describe('Craft Actions', () => {
    it('craftBoneTotem produces correct amount', () => {
      const state = createTestState({
        buildings: { altar: 1 },
      });
      const effectUpdates = applyActionEffects('craftBoneTotem', state);

      expect(effectUpdates.resources?.bone_totem).toBe((state.resources.bone_totem || 0) + 1);
    });

    it('craftBoneTotems5 produces correct amount', () => {
      const state = createTestState({
        buildings: { sanctum: 1 },
      });
      const effectUpdates = applyActionEffects('craftBoneTotems5', state);

      expect(effectUpdates.resources?.bone_totem).toBe((state.resources.bone_totem || 0) + 5);
    });

    it('craftLeatherTotem produces correct amount', () => {
      const state = createTestState({
        buildings: { temple: 1 },
      });
      const effectUpdates = applyActionEffects('craftLeatherTotem', state);

      expect(effectUpdates.resources?.leather_totem).toBe((state.resources.leather_totem || 0) + 1);
    });

    it('craftLeatherTotems5 produces correct amount', () => {
      const state = createTestState({
        buildings: { sanctum: 1 },
      });
      const effectUpdates = applyActionEffects('craftLeatherTotems5', state);

      expect(effectUpdates.resources?.leather_totem).toBe((state.resources.leather_totem || 0) + 5);
    });
  });

  describe('Advanced Mining Actions', () => {
    it('mineSulfur gains match tooltip', () => {
      const state = createTestState({
        tools: { steel_pickaxe: true },
        buildings: { foundry: 1 },
      });
      const { expectedGains, actualGains } = testActionGains('mineSulfur', state);

      expect(expectedGains.sulfur).toBeDefined();
      expect(actualGains.sulfur).toBeDefined();

      const minActual = Math.min(...actualGains.sulfur);
      const maxActual = Math.max(...actualGains.sulfur);

      expect(minActual).toBeGreaterThanOrEqual(expectedGains.sulfur.min);
      expect(maxActual).toBeLessThanOrEqual(expectedGains.sulfur.max);
    });

    it('mineAdamant gains match tooltip', () => {
      const state = createTestState({
        tools: { obsidian_pickaxe: true },
      });
      const { expectedGains, actualGains } = testActionGains('mineAdamant', state);

      expect(expectedGains.adamant).toBeDefined();
      expect(actualGains.adamant).toBeDefined();

      const minActual = Math.min(...actualGains.adamant);
      const maxActual = Math.max(...actualGains.adamant);

      expect(minActual).toBeGreaterThanOrEqual(expectedGains.adamant.min);
      expect(maxActual).toBeLessThanOrEqual(expectedGains.adamant.max);
    });
  });

  describe('Trade Actions', () => {
    it('tradeGoldForFood (tier 3) produces correct amount', () => {
      const state = createTestState({
        buildings: { merchantsGuild: 1 },
      });
      const effectUpdates = applyActionEffects('tradeGoldForFood', state);

      // Tier 3 gives 1000 food
      expect(effectUpdates.resources?.food).toBe(state.resources.food + 1000);
      // Costs 40 gold
      expect(effectUpdates.resources?.gold).toBe(state.resources.gold - 40);
    });

    it('tradeGoldForStone (tier 3) produces correct amount', () => {
      const state = createTestState({
        buildings: { merchantsGuild: 1 },
      });
      const effectUpdates = applyActionEffects('tradeGoldForStone', state);

      // Tier 3 gives 1000 stone
      expect(effectUpdates.resources?.stone).toBe(state.resources.stone + 1000);
      // Costs 60 gold
      expect(effectUpdates.resources?.gold).toBe(state.resources.gold - 60);
    });

    it('tradeGoldForTorch (tier 3) produces correct amount', () => {
      const state = createTestState({
        buildings: { merchantsGuild: 1 },
      });
      const effectUpdates = applyActionEffects('tradeGoldForTorch', state);

      // Tier 3 gives 250 torches
      expect(effectUpdates.resources?.torch).toBe(state.resources.torch + 250);
      // Costs 75 gold
      expect(effectUpdates.resources?.gold).toBe(state.resources.gold - 75);
    });

    it('tradeSilverForGold (tier 3) produces correct amount', () => {
      const state = createTestState({
        buildings: { merchantsGuild: 1 },
      });
      const effectUpdates = applyActionEffects('tradeSilverForGold', state);

      // Tier 3 gives 50 gold
      expect(effectUpdates.resources?.gold).toBe(state.resources.gold + 50);
      // Costs 200 silver
      expect(effectUpdates.resources?.silver).toBe(state.resources.silver - 200);
    });
  });
});