import type { GameState } from "@shared/schema";
import { createInitialState } from "@/game/state";
import {
  BLOODFLAME_SPHERE_UPGRADES,
  CRUSHING_STRIKE_UPGRADES,
} from "@/game/rules/skillUpgrades";

export type CombatDemoConfig = {
  crushingStrikeLevel: number;
  bloodflameSphereLevel: number;
  restlessKnightWounded: boolean;
  elderWizardWounded: boolean;
  hasFortress: boolean;
  grenadierBag: boolean;
  flaskHarness: boolean;
};

export const COMBAT_DEMO_DEFAULT_CONFIG: CombatDemoConfig = {
  crushingStrikeLevel: CRUSHING_STRIKE_UPGRADES.length - 1,
  bloodflameSphereLevel: BLOODFLAME_SPHERE_UPGRADES.length - 1,
  restlessKnightWounded: false,
  elderWizardWounded: false,
  hasFortress: true,
  grenadierBag: true,
  flaskHarness: true,
};

export type EnemyPresetId = "training" | "wave3" | "wave7" | "boss";

export const ENEMY_PRESETS: Record<
  EnemyPresetId,
  { label: string; attack: number; maxHealth: number; waveNumber: number }
> = {
  training: { label: "Training dummy", attack: 5, maxHealth: 120, waveNumber: 1 },
  wave3: { label: "Wave 3", attack: 25, maxHealth: 150, waveNumber: 3 },
  wave7: { label: "Wave 7", attack: 45, maxHealth: 250, waveNumber: 7 },
  boss: { label: "Boss", attack: 80, maxHealth: 500, waveNumber: 10 },
};

export function buildCombatDemoEnemy(presetId: EnemyPresetId) {
  const preset = ENEMY_PRESETS[presetId];
  return {
    name: "Pale Creatures",
    attack: preset.attack,
    maxHealth: preset.maxHealth,
    currentHealth: preset.maxHealth,
    waveNumber: preset.waveNumber,
  };
}

/** Full combat stash: max bombs + elixirs for repeated test runs. */
export function combatDemoResourceStock(): Pick<
  GameState["resources"],
  "ember_bomb" | "ashfire_bomb" | "void_bomb" | "veinfire_elixir"
> {
  return {
    ember_bomb: 20,
    ashfire_bomb: 20,
    void_bomb: 20,
    veinfire_elixir: 10,
  };
}

/**
 * Late-game combat loadout so CombatDialog matches a real fight:
 * luck / madness / crit / knowledge / strength come from owned effects
 * (getTotalLuck etc.), not hardcoded stats.
 */
export function buildCombatDemoGameState(
  config: CombatDemoConfig,
): Partial<GameState> {
  const base = createInitialState();

  return {
    ...base,
    flags: {
      ...base.flags,
      gameStarted: true,
      bastionUnlocked: true,
      hasFortress: config.hasFortress,
    },
    buildings: {
      ...base.buildings,
      bastion: 1,
      watchtower: 4,
      palisades: 3,
      fortifiedMoat: 1,
      chitinPlating: 1,
    },
    weapons: {
      ...base.weapons,
      blacksteel_sword: true,
      nightshade_bow: true,
      blacksteel_bow: true,
      ashen_dagger: true,
    },
    // blacksteel_armor is crafted into clothing but omitted from the Zod clothing
    // shape; cast so the demo can still activate its 5% crit effect.
    clothing: {
      ...base.clothing,
      grenadier_bag: config.grenadierBag,
      flask_harness: config.flaskHarness,
      blacksteel_armor: true,
      cracked_crown: true,
      tarnished_amulet: true,
      ravenfeather_mantle: true,
      moon_bracelet: true,
      bone_necklace: true,
      ebony_ring: true,
      muttering_amulet: true,
      bloodstained_belt: true,
      alphas_hide: true,
    } as GameState["clothing"],
    relics: {
      ...base.relics,
      bone_dice: true,
      wooden_figure: true,
      elder_scroll: true,
      ravens_orb: true,
      tarnished_compass: true,
    },
    blessings: {
      ...base.blessings,
      blood_baptized: true,
      knights_burden: true,
      bell_blessing: true,
      survivors_last_words: true,
    },
    fellowship: {
      restless_knight: true,
      elder_wizard: true,
      ashwraith_huntress: true,
      one_eyed_crow: true,
      disgraced_prior: true,
      the_hound: false,
    },
    combatSkills: {
      crushingStrikeLevel: config.crushingStrikeLevel,
      bloodflameSphereLevel: config.bloodflameSphereLevel,
    },
    villagers: {
      ...base.villagers,
      gatherer: 5,
      hunter: 3,
      iron_miner: 2,
    },
    resources: {
      ...base.resources,
      ...combatDemoResourceStock(),
      gold: 5000,
      silver: 500,
    },
    story: {
      ...base.story,
      seen: {
        ...base.story?.seen,
        restlessKnightWounded: config.restlessKnightWounded,
        elderWizardWounded: config.elderWizardWounded,
      },
    },
  };
}
