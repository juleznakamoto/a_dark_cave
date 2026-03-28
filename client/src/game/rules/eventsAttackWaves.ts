import type { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { useGameStore } from "@/game/state";
import { CRUEL_MODE, cruelModeScale } from "../cruelMode";
import { ATTACK_WAVE_IDS, type AttackWaveId, isFinalAttackWave } from "./attackWaveOrder";

// Helper function to calculate enemy stats
function calculateEnemyStats(
  params: {
    attack: {
      cruelBonus: number;
      options: number[];
    };
    health: { base: number; cruelBonus: number };
  },
  state: GameState,
) {
  const health = params.health.base + cruelModeScale(state) * params.health.cruelBonus;

  const attack =
    params.attack.options[
    Math.floor(Math.random() * params.attack.options.length)
    ] +
    cruelModeScale(state) * params.attack.cruelBonus;

  return {
    attack,
    maxHealth: health,
    currentHealth: health,
  };
}

type WaveParams = {
  attack: { options: number[]; cruelBonus: number };
  health: { base: number; cruelBonus: number };
  goldReward: number;
  initialDuration: number;
  defeatDuration: number;
  maxCasualties: number;
  buildingDamageMultiplier: number;
  fellowshipWoundedMultiplier: number;
};

type VictoryFlagName =
  | "firstWaveVictory"
  | "secondWaveVictory"
  | "thirdWaveVictory"
  | "fourthWaveVictory"
  | "fifthWaveVictory"
  | "sixthWaveVictory"
  | "seventhWaveVictory"
  | "eighthWaveVictory"
  | "ninthWaveVictory"
  | "tenthWaveVictory";

/** Chart rows only need story / buildings / weapons (avoids GameStore vs GameState mismatch). */
export type AttackWaveChartState = Pick<
  GameState,
  "story" | "buildings" | "weapons"
>;

/** Event loop passes full zustand store; schema `GameState` omits UI fields. */
type AttackWaveRuntimeState = GameState & {
  eventDialog?: { isOpen: boolean };
  combatDialog?: { isOpen: boolean };
  authDialogOpen?: boolean;
  shopDialogOpen?: boolean;
  leaderboardDialogOpen?: boolean;
  idleModeDialog?: { isOpen: boolean };
  isPaused?: boolean;
};

type WaveRules = {
  /** When true, player can start this wave's timer (chart / UX), independent of victory. */
  prerequisiteMet: (state: AttackWaveChartState) => boolean;
  /** Full event availability: prerequisite + not yet won this wave. */
  condition: (state: GameState) => boolean;
  triggeredFlag: "firstWaveTriggered" | "secondWaveTriggered" | null;
  victoryFlag: VictoryFlagName;
};

type AttackWaveDefinition = WaveParams & {
  title: string;
  message: string;
};

/** Combat UI label for every attack wave (shared across all waves). */
const ATTACK_WAVE_ENEMY_NAME = "Pale Creatures";

/** Shared countdown timers for every attack wave (ms). */
const ATTACK_WAVE_TIMER_DEFAULTS = {
  initialDuration: 10 * 60 * 1000,
  defeatDuration: 20 * 60 * 1000,
} as const;

/** Wave index 1..10 → reward / siege-impact fields (combat uses per-wave attack/health below). */
function attackWaveScaledParams(waveNumber: number): Pick<
  WaveParams,
  | "goldReward"
  | "maxCasualties"
  | "buildingDamageMultiplier"
  | "fellowshipWoundedMultiplier"
> {
  return {
    buildingDamageMultiplier: 1 + waveNumber / 5,
    fellowshipWoundedMultiplier: waveNumber * 0.05,
    maxCasualties: waveNumber * 5,
    goldReward: waveNumber * 50,
  };
}

/** Per-wave combat, timers, rewards, and event-dialog copy. */
const ATTACK_WAVE_DEFINITIONS: Record<AttackWaveId, AttackWaveDefinition> = {
  firstWave: {
    title: "The First Wave",
    message:
      "Pale figures emerge from the cave, finally freed, their ember eyes cutting through the dark as they march towards the city.",
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(1),
    attack: { options: [30], cruelBonus: 5 },
    health: { base: 300, cruelBonus: 50 },
  },
  secondWave: {
    title: "The Second Wave",
    message:
      "The creatures return in greater numbers, with weapons of crude bone, glowing with foul light.",
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(2),
    attack: { options: [35], cruelBonus: 5 },
    health: { base: 350, cruelBonus: 50 },
  },
  thirdWave: {
    title: "The Third Wave",
    message:
      "Hordes of pale creatures come from the cave; screams shake even the stones, their bone weapons cracking the ground.",
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(3),
    attack: { options: [40], cruelBonus: 10 },
    health: { base: 400, cruelBonus: 75 },
  },
  fourthWave: {
    title: "The Fourth Wave",
    message:
      "The sky seems to darken as an uncountable mass of pale creatures surges from the cave, pressing towards the city.",
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(4),
    attack: { options: [45], cruelBonus: 10 },
    health: { base: 450, cruelBonus: 100 },
  },
  fifthWave: {
    title: "The Fifth Wave",
    message:
      "From the cave emerge countless pale figures, their forms unspeakable as they advance on the city.",
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(5),
    attack: { options: [50], cruelBonus: 15 },
    health: { base: 500, cruelBonus: 125 },
  },
  sixthWave: {
    title: "The Sixth Wave",
    message:
      "The cave mouth vomits forth another tide of pale bodies. Bone spears clatter like rain as they mass for another assault.",
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(6),
    attack: { options: [60], cruelBonus: 15 },
    health: { base: 550, cruelBonus: 150 },
  },
  seventhWave: {
    title: "The Seventh Wave",
    message:
      "The creatures advance again, a writhing carpet of limbs and teeth scraping toward the city.",
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(7),
    attack: { options: [70], cruelBonus: 20 },
    health: { base: 600, cruelBonus: 175 },
  },
  eighthWave: {
    title: "The Eighth Wave",
    message:
      "The ground shudders under the weight of their numbers, as a new wave of the pale horde tightens its ring around the city.",
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(8),
    attack: { options: [80], cruelBonus: 20 },
    health: { base: 700, cruelBonus: 200 },
  },
  ninthWave: {
    title: "The Ninth Wave",
    message:
      "With unrelenting hunger, an even larger mass of pale creatures surges toward the city.",
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(9),
    attack: { options: [90], cruelBonus: 30 },
    health: { base: 800, cruelBonus: 225 },
  },
  tenthWave: {
    title: "The Final Wave",
    message:
      "From the deepest reaches of the cave, an unimaginable mass of pale creatures erupts. They flood over the land like a living tide, as the city braces for annihilation.",
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(10),
    attack: { options: [100], cruelBonus: 50 },
    health: { base: 1000, cruelBonus: 250 },
  },
};

const WAVE_RULES: Record<AttackWaveId, WaveRules> = {
  firstWave: {
    prerequisiteMet: (state: AttackWaveChartState) =>
      Boolean(state.story.seen.portalBlasted && state.buildings.bastion),
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.portalBlasted &&
        state.buildings.bastion &&
        !state.story.seen.firstWaveVictory,
      ),
    triggeredFlag: "firstWaveTriggered",
    victoryFlag: "firstWaveVictory",
  },
  secondWave: {
    prerequisiteMet: (state: AttackWaveChartState) =>
      Boolean(state.story.seen.firstWaveVictory),
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.firstWaveVictory &&
        !state.story.seen.secondWaveVictory,
      ),
    triggeredFlag: "secondWaveTriggered",
    victoryFlag: "secondWaveVictory",
  },
  thirdWave: {
    prerequisiteMet: (state: AttackWaveChartState) =>
      Boolean(
        state.story.seen.wizardDecryptsScrolls &&
        state.story.seen.secondWaveVictory,
      ),
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.wizardDecryptsScrolls &&
        state.story.seen.secondWaveVictory &&
        !state.story.seen.thirdWaveVictory,
      ),
    triggeredFlag: null,
    victoryFlag: "thirdWaveVictory",
  },
  fourthWave: {
    prerequisiteMet: (state: AttackWaveChartState) =>
      Boolean(state.story.seen.thirdWaveVictory),
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.thirdWaveVictory &&
        !state.story.seen.fourthWaveVictory,
      ),
    triggeredFlag: null,
    victoryFlag: "fourthWaveVictory",
  },
  fifthWave: {
    prerequisiteMet: (state: AttackWaveChartState) =>
      Boolean(
        state.weapons.frostglass_sword && state.story.seen.fourthWaveVictory,
      ),
    condition: (state: GameState) =>
      Boolean(
        state.weapons.frostglass_sword &&
        state.story.seen.fourthWaveVictory &&
        !state.story.seen.fifthWaveVictory,
      ),
    triggeredFlag: null,
    victoryFlag: "fifthWaveVictory",
  },
  sixthWave: {
    prerequisiteMet: (state: AttackWaveChartState) =>
      Boolean(state.story.seen.fifthWaveVictory),
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.fifthWaveVictory &&
        !state.story.seen.sixthWaveVictory,
      ),
    triggeredFlag: null,
    victoryFlag: "sixthWaveVictory",
  },
  seventhWave: {
    prerequisiteMet: (state: AttackWaveChartState) =>
      Boolean(state.story.seen.sixthWaveVictory),
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.sixthWaveVictory &&
        !state.story.seen.seventhWaveVictory,
      ),
    triggeredFlag: null,
    victoryFlag: "seventhWaveVictory",
  },
  eighthWave: {
    prerequisiteMet: (state: AttackWaveChartState) =>
      Boolean(
        state.weapons.bloodstone_staff && state.story.seen.seventhWaveVictory,
      ),
    condition: (state: GameState) =>
      Boolean(
        state.weapons.bloodstone_staff &&
        state.story.seen.seventhWaveVictory &&
        !state.story.seen.eighthWaveVictory,
      ),
    triggeredFlag: null,
    victoryFlag: "eighthWaveVictory",
  },
  ninthWave: {
    prerequisiteMet: (state: AttackWaveChartState) =>
      Boolean(state.story.seen.eighthWaveVictory),
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.eighthWaveVictory &&
        !state.story.seen.ninthWaveVictory,
      ),
    triggeredFlag: null,
    victoryFlag: "ninthWaveVictory",
  },
  tenthWave: {
    prerequisiteMet: (state: AttackWaveChartState) =>
      Boolean(state.story.seen.ninthWaveVictory),
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.ninthWaveVictory &&
        !state.story.seen.tenthWaveVictory,
      ),
    triggeredFlag: null,
    victoryFlag: "tenthWaveVictory",
  },
};

const VICTORY_MESSAGE = (goldReward: number) =>
  `The defenses hold! The pale creatures crash against the walls but cannot break through. You claim ${goldReward} gold from the fallen creatures.`;

const FINAL_WAVE_VICTORY_MESSAGE = (goldReward: number) =>
  `The final wave has been defeated! The path beyond the shattered gate now lies open. You can venture deeper into the depths to discover what lies beyond. You claim ${goldReward} gold from the fallen creatures.`;

function createDefeatMessage(
  casualties: number,
  damagedBuildings: string[],
  woundedFellows: string[] = [],
): string {
  let msg = "The creatures overwhelm your defenses. ";

  if (casualties === 0) {
    msg +=
      "The defenses crumble under the assault before the remaining creatures retreat to the depths.";
  } else if (casualties === 1) {
    msg +=
      "One villager falls before the remaining creatures retreat to the depths.";
  } else {
    msg += `${casualties} villagers fall before the remaining creatures retreat to the depths.`;
  }

  if (damagedBuildings.length > 0) {
    msg += ` The ${damagedBuildings.join(" and ")} ${damagedBuildings.length === 1 ? "is" : "are"} damaged in the assault.`;
  }

  if (woundedFellows.length > 0) {
    msg += ` ${woundedFellows.join(" and ")} ${woundedFellows.length === 1 ? "is" : "are"} wounded in battle.`;
  }

  return msg;
}

function handleDefeat(
  state: GameState,
  DamageBuildingMultiplier: number,
  maxCasualties: number,
  fellowshipWoundedMultiplier: number,
) {
  const currentPopulation = Object.values(state.villagers).reduce(
    (sum, count) => sum + (count || 0),
    0,
  );
  const minCasualities = Math.ceil(
    Math.random() * 0.8 * maxCasualties +
    0.2 * maxCasualties +
    cruelModeScale(state) * CRUEL_MODE.attackWaveDefeat.extraCasualtiesWhenCruel,
  );
  const casualties = Math.min(minCasualities, currentPopulation);
  const deathResult = killVillagers(state, casualties);
  const actualCasualties = deathResult.villagersKilled || 0;

  let buildingDamage = {};
  const damagedBuildings: string[] = [];

  const baseChance = Math.min(
    DamageBuildingMultiplier * 0.1 +
    cruelModeScale(state) * CRUEL_MODE.attackWaveDefeat.buildingDamageChanceCruelAdd,
    0.9,
  );

  const chance = (prob: number) => Math.random() < prob;

  let fellowshipWounded = {};
  const woundedFellows: string[] = [];
  const fellowshipChance = Math.min(
    fellowshipWoundedMultiplier +
    cruelModeScale(state) * CRUEL_MODE.attackWaveDefeat.fellowshipWoundChanceCruelAdd,
    0.9,
  );

  if (
    state.fellowship?.restless_knight &&
    !state.story.seen.restlessKnightWounded &&
    chance(fellowshipChance)
  ) {
    fellowshipWounded = { ...fellowshipWounded, restlessKnightWounded: true };
    woundedFellows.push("Restless Knight");
  }

  if (
    state.fellowship?.elder_wizard &&
    !state.story.seen.elderWizardWounded &&
    chance(fellowshipChance)
  ) {
    fellowshipWounded = { ...fellowshipWounded, elderWizardWounded: true };
    woundedFellows.push("Elder Wizard");
  }

  if (
    state.buildings.bastion > 0 &&
    !state.story.seen.bastionDamaged &&
    chance(baseChance)
  ) {
    buildingDamage = { ...buildingDamage, bastionDamaged: true };
    damagedBuildings.push("bastion");
  }

  if (
    state.buildings.watchtower > 0 &&
    !state.story.seen.watchtowerDamaged &&
    chance(baseChance)
  ) {
    buildingDamage = { ...buildingDamage, watchtowerDamaged: true };
    damagedBuildings.push("watchtower");
  }

  if (
    state.buildings.palisades > 0 &&
    !state.story.seen.palisadesDamaged &&
    chance(baseChance)
  ) {
    buildingDamage = { ...buildingDamage, palisadesDamaged: true };
    damagedBuildings.push("palisades");
  }

  return {
    ...deathResult,
    story: {
      ...state.story,
      seen: {
        ...state.story.seen,
        ...buildingDamage,
        ...fellowshipWounded,
      },
    },
    _logMessage: createDefeatMessage(
      actualCasualties,
      damagedBuildings,
      woundedFellows,
    ),
    _combatSummary: {
      casualties: actualCasualties,
      damagedBuildings,
      woundedFellows,
    },
  };
}

function createAttackWaveEvent(waveId: AttackWaveId): GameEvent {
  const def = ATTACK_WAVE_DEFINITIONS[waveId];
  const rules = WAVE_RULES[waveId];

  return {
    id: waveId,
    condition: (state: GameState) => {
      const baseCondition = rules.condition(state);

      if (!baseCondition) return false;

      const timer = state.attackWaveTimers?.[waveId];
      if (!timer) {
        setTimeout(() => {
          const currentState = useGameStore.getState();
          if (!currentState.attackWaveTimers?.[waveId]) {
            useGameStore.setState({
              attackWaveTimers: {
                ...currentState.attackWaveTimers,
                [waveId]: {
                  startTime: Date.now(),
                  duration: def.initialDuration,
                  defeated: false,
                  provoked: false,
                  elapsedTime: 0,
                },
              },
            });
          }
        }, 0);
        return false;
      }

      if (timer.defeated) return false;

      const rt = state as AttackWaveRuntimeState;
      const isDialogOpen =
        rt.eventDialog?.isOpen ||
        rt.combatDialog?.isOpen ||
        rt.authDialogOpen ||
        rt.shopDialogOpen ||
        rt.leaderboardDialogOpen ||
        rt.idleModeDialog?.isOpen;
      const isPaused = Boolean(rt.isPaused || isDialogOpen);

      if (isPaused) {
        if (timer.startTime && timer.elapsedTime !== undefined) {
          const currentElapsedTime =
            timer.elapsedTime + (Date.now() - timer.startTime);
          useGameStore.setState((prevState) => ({
            attackWaveTimers: {
              ...prevState.attackWaveTimers,
              [waveId]: {
                ...prevState.attackWaveTimers[waveId],
                startTime: Date.now(),
                elapsedTime: currentElapsedTime,
              },
            },
          }));
        }
        return false;
      }

      const elapsed = timer.elapsedTime || 0;
      const shouldTrigger = elapsed >= timer.duration || timer.provoked;
      return shouldTrigger;
    },

    timeProbability: 0.25,
    title: def.title,
    message: def.message,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      const enemyStats = calculateEnemyStats(def, state);

      const storyUpdate = rules.triggeredFlag
        ? {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              [rules.triggeredFlag]: true,
            },
          },
        }
        : {};

      return {
        ...storyUpdate,
        _combatData: {
          enemy: {
            name: ATTACK_WAVE_ENEMY_NAME,
            ...enemyStats,
          },
          eventTitle: def.title,
          eventMessage: def.message,
          onVictory: () => ({
            resources: {
              gold: def.goldReward,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                [rules.victoryFlag]: true,
              },
            },
            attackWaveTimers: {
              ...state.attackWaveTimers,
              [waveId]: {
                ...state.attackWaveTimers[waveId],
                defeated: true,
              },
            },
            _logMessage: isFinalAttackWave(waveId)
              ? FINAL_WAVE_VICTORY_MESSAGE(def.goldReward)
              : VICTORY_MESSAGE(def.goldReward),
            _combatSummary: {
              goldReward: def.goldReward,
            },
          }),
          onDefeat: () => {
            const defeatResult = handleDefeat(
              state,
              def.buildingDamageMultiplier,
              def.maxCasualties,
              def.fellowshipWoundedMultiplier,
            );
            return {
              ...defeatResult,
              attackWaveTimers: {
                ...state.attackWaveTimers,
                [waveId]: {
                  startTime: Date.now(),
                  duration: def.defeatDuration,
                  defeated: false,
                  elapsedTime: 0,
                },
              },
              events:
                waveId === "firstWave"
                  ? {
                    ...state.events,
                    firstWave: false,
                  }
                  : state.events,
            };
          },
        },
      };
    },
  };
}

function buildAttackWaveEvents(): Record<string, GameEvent> {
  const out: Record<string, GameEvent> = {};
  for (const id of ATTACK_WAVE_IDS) {
    out[id] = createAttackWaveEvent(id);
  }
  return out;
}

export const attackWaveEvents: Record<string, GameEvent> = buildAttackWaveEvents();

/** UI: display name per wave (short label for chart). */
export const ATTACK_WAVE_DISPLAY_NAMES: Record<AttackWaveId, string> = {
  firstWave: "First Wave",
  secondWave: "Second Wave",
  thirdWave: "Third Wave",
  fourthWave: "Fourth Wave",
  fifthWave: "Fifth Wave",
  sixthWave: "Sixth Wave",
  seventhWave: "Seventh Wave",
  eighthWave: "Eighth Wave",
  ninthWave: "Ninth Wave",
  tenthWave: "Tenth Wave",
};

export function getAttackWavesChartRows(state: AttackWaveChartState): {
  id: AttackWaveId;
  name: string;
  completed: boolean;
  conditionMet: boolean;
}[] {
  const seen = state.story?.seen || {};
  return ATTACK_WAVE_IDS.map((id) => {
    const rules = WAVE_RULES[id];
    return {
      id,
      name: ATTACK_WAVE_DISPLAY_NAMES[id],
      completed: Boolean(seen[rules.victoryFlag]),
      conditionMet: rules.prerequisiteMet(state),
    };
  });
}
