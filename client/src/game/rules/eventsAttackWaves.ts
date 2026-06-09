import type { EventChoiceEffectResult, GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { useGameStore, isModalDialogOpen } from "@/game/state";
import { CRUEL_MODE, cruelModeScale } from "../cruelMode";
import { getVillagersInVillage } from "../population";
import {
  ATTACK_WAVE_IDS,
  POST_COMPLETION_ATTACK_WAVE_ID,
  type AttackWaveId,
} from "./attackWaveOrder";
import { resolveEventMessage, resolveEventTitle } from "@/i18n/eventText";
import type { CombatResultSummary } from "@/game/types";

/** story.seen flag: first defeat on this wave (one-time madness grant). */
export function attackWaveDefeatSeenFlag(waveId: AttackWaveId): string {
  return `${waveId}Defeat`;
}

const attackWaveDefeatMadnessGain = (state: GameState): number =>
  1 +
  (state.cruelMode ? CRUEL_MODE.madnessFromEvents.flatBonusWhenCruel : 0);

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

type WaveRules = {
  /** When true, player can start this wave's timer (chart / UX), independent of victory. */
  prerequisiteMet: (state: AttackWaveChartState) => boolean;
  /** Full event availability: prerequisite + not yet won this wave. */
  condition: (state: GameState) => boolean;
  triggeredFlag: "firstWaveTriggered" | "secondWaveTriggered" | null;
  victoryFlag: VictoryFlagName;
};

type AttackWaveDefinition = WaveParams;

/** Combat UI label for every attack wave (shared across all waves). */
const ATTACK_WAVE_ENEMY_NAME = "Pale Creatures";

/** Shared countdown timers for every attack wave (ms). */
const ATTACK_WAVE_TIMER_DEFAULTS = {
  initialDuration: 10 * 60 * 1000,
  defeatDuration: 20 * 60 * 1000,
} as const;

const CANONICAL_ATTACK_WAVE_COUNT = 10;
const POST_WAVE_HEALTH_INCREMENT = 50;
const POST_WAVE_ATTACK_INCREMENT = 10;
const POST_WAVE_GOLD_INCREMENT = 50;

/** True after the final cube choice (cube15a/b). */
export function isGameStoryCompleted(state: GameState): boolean {
  return Boolean(state.events?.cube15a || state.events?.cube15b);
}

/** All ten chart waves have been won. */
export function areAllCanonicalAttackWavesCompleted(state: GameState): boolean {
  return Boolean(state.story?.seen?.tenthWaveVictory);
}

/** Endless waves after story complete and all 10 chart waves won. */
export function isPostCompletionAttackWavesActive(state: GameState): boolean {
  return (
    isGameStoryCompleted(state) && areAllCanonicalAttackWavesCompleted(state)
  );
}

/** Next post-completion wave number (11, 12, …). */
export function getPostCompletionWaveNumber(state: GameState): number {
  return CANONICAL_ATTACK_WAVE_COUNT + 1 + (state.postCompletionAttackWaveCount ?? 0);
}

type AttackWaveTimer = NonNullable<GameState["attackWaveTimers"]>[string];

/** True when the player paused this wave's countdown (endless waves UI). */
export function isAttackWaveTimerUserPaused(timer: AttackWaveTimer): boolean {
  return Boolean(timer.pausedAt);
}

/** Toggle pause on the endless post-completion attack wave timer. */
export function togglePostCompletionAttackWaveTimerPause(
  state: GameState,
): Partial<GameState> | null {
  if (!isPostCompletionAttackWavesActive(state)) {
    return null;
  }

  const waveId = POST_COMPLETION_ATTACK_WAVE_ID;
  const timer = state.attackWaveTimers?.[waveId];
  if (!timer || timer.defeated) {
    return null;
  }

  const paused = isAttackWaveTimerUserPaused(timer);
  return {
    attackWaveTimers: {
      ...state.attackWaveTimers,
      [waveId]: {
        ...timer,
        pausedAt: paused ? undefined : Date.now(),
        startTime: Date.now(),
      },
    },
  };
}

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
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(1),
    attack: { options: [30], cruelBonus: 5 },
    health: { base: 400, cruelBonus: 50 },
  },
  secondWave: {
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(2),
    attack: { options: [35], cruelBonus: 5 },
    health: { base: 500, cruelBonus: 50 },
  },
  thirdWave: {
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(3),
    attack: { options: [40], cruelBonus: 10 },
    health: { base: 600, cruelBonus: 100 },
  },
  fourthWave: {
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(4),
    attack: { options: [45], cruelBonus: 10 },
    health: { base: 700, cruelBonus: 100 },
  },
  fifthWave: {
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(5),
    attack: { options: [50], cruelBonus: 15 },
    health: { base: 800, cruelBonus: 150 },
  },
  sixthWave: {
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(6),
    attack: { options: [60], cruelBonus: 15 },
    health: { base: 900, cruelBonus: 150 },
  },
  seventhWave: {
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(7),
    attack: { options: [70], cruelBonus: 20 },
    health: { base: 1000, cruelBonus: 200 },
  },
  eighthWave: {
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(8),
    attack: { options: [80], cruelBonus: 20 },
    health: { base: 1100, cruelBonus: 200 },
  },
  ninthWave: {
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(9),
    attack: { options: [90], cruelBonus: 30 },
    health: { base: 1200, cruelBonus: 250 },
  },
  tenthWave: {
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(10),
    attack: { options: [100], cruelBonus: 50 },
    health: { base: 1400, cruelBonus: 250 },
  },
};

/** Post-completion wave stats: +50 integrity, +10 attack, +50 gold per wave beyond the tenth. */
export function getPostCompletionWaveParams(waveNumber: number): WaveParams {
  const stepsBeyondTenth = waveNumber - CANONICAL_ATTACK_WAVE_COUNT;
  const tenthDef = ATTACK_WAVE_DEFINITIONS.tenthWave;
  return {
    ...ATTACK_WAVE_TIMER_DEFAULTS,
    ...attackWaveScaledParams(waveNumber),
    goldReward:
      tenthDef.goldReward + stepsBeyondTenth * POST_WAVE_GOLD_INCREMENT,
    attack: {
      options: [
        tenthDef.attack.options[0] + stepsBeyondTenth * POST_WAVE_ATTACK_INCREMENT,
      ],
      cruelBonus: tenthDef.attack.cruelBonus,
    },
    health: {
      base: tenthDef.health.base + stepsBeyondTenth * POST_WAVE_HEALTH_INCREMENT,
      cruelBonus: tenthDef.health.cruelBonus,
    },
  };
}

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

function handleDefeat(
  state: GameState,
  DamageBuildingMultiplier: number,
  maxCasualties: number,
  fellowshipWoundedMultiplier: number,
) {
  const currentPopulation = getVillagersInVillage(state);
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
    woundedFellows.push("restless_knight");
  }

  if (
    state.fellowship?.elder_wizard &&
    !state.story.seen.elderWizardWounded &&
    chance(fellowshipChance)
  ) {
    fellowshipWounded = { ...fellowshipWounded, elderWizardWounded: true };
    woundedFellows.push("elder_wizard");
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
    damagedBuildings.push(`watchtower/${state.buildings.watchtower}`);
  }

  if (
    state.buildings.palisades > 0 &&
    !state.story.seen.palisadesDamaged &&
    chance(baseChance)
  ) {
    buildingDamage = { ...buildingDamage, palisadesDamaged: true };
    damagedBuildings.push(`palisades/${state.buildings.palisades}`);
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
    _combatSummary: {
      casualties: actualCasualties,
      damagedBuildings,
      woundedFellows,
    },
  };
}

/** Canonical waves 1–10 only; endless post-completion waves never grant defeat madness. */
export function isAttackWaveDefeatMadnessEligible(
  waveId: string,
): waveId is AttackWaveId {
  return (ATTACK_WAVE_IDS as readonly string[]).includes(waveId);
}

/** First defeat per wave grants +1 madness (up to +10 across all waves). */
export function applyAttackWaveDefeatMadness(
  state: GameState,
  waveId: string,
  defeatResult: ReturnType<typeof handleDefeat>,
): ReturnType<typeof handleDefeat> & { _combatSummary: CombatResultSummary } {
  if (!isAttackWaveDefeatMadnessEligible(waveId)) {
    return defeatResult;
  }

  const defeatFlag = attackWaveDefeatSeenFlag(waveId);
  const isFirstDefeat = !state.story.seen[defeatFlag];
  if (!isFirstDefeat) {
    return defeatResult;
  }

  const madnessGain = attackWaveDefeatMadnessGain(state);
  return {
    ...defeatResult,
    story: {
      ...defeatResult.story,
      seen: {
        ...defeatResult.story.seen,
        [defeatFlag]: true,
      },
    },
    stats: {
      ...(defeatResult.stats ?? state.stats),
      madnessFromEvents:
        ((defeatResult.stats?.madnessFromEvents ??
          state.stats.madnessFromEvents) ||
          0) + madnessGain,
    },
    _combatSummary: {
      ...defeatResult._combatSummary,
      madnessGain,
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

      if (isAttackWaveTimerUserPaused(timer) && !timer.provoked) {
        return false;
      }

      const store = useGameStore.getState();
      const isPaused = Boolean(
        store.isPaused || isModalDialogOpen(store),
      );

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
          eventTitle: resolveEventTitle(waveId, state) ?? "",
          eventMessage: resolveEventMessage(waveId, undefined, state),
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
            _combatSummary: {
              goldReward: def.goldReward,
            },
          }),
          onDefeat: () => {
            const defeatResult = applyAttackWaveDefeatMadness(
              state,
              waveId,
              handleDefeat(
                state,
                def.buildingDamageMultiplier,
                def.maxCasualties,
                def.fellowshipWoundedMultiplier,
              ),
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

function clearPostCompletionAttackWaveTimer(): void {
  setTimeout(() => {
    useGameStore.setState((prevState) => {
      const timers = { ...(prevState.attackWaveTimers ?? {}) };
      delete timers[POST_COMPLETION_ATTACK_WAVE_ID];
      return { attackWaveTimers: timers };
    });
  }, 0);
}

function createPostCompletionAttackWaveEvent(): GameEvent {
  const waveId = POST_COMPLETION_ATTACK_WAVE_ID;

  return {
    id: waveId,
    condition: (state: GameState) => {
      if (!isPostCompletionAttackWavesActive(state)) {
        return false;
      }

      const waveNumber = getPostCompletionWaveNumber(state);
      const def = getPostCompletionWaveParams(waveNumber);
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

      if (timer.defeated) {
        return false;
      }

      if (isAttackWaveTimerUserPaused(timer) && !timer.provoked) {
        return false;
      }

      const store = useGameStore.getState();
      const isPaused = Boolean(store.isPaused || isModalDialogOpen(store));

      if (isPaused) {
        if (timer.startTime && timer.elapsedTime !== undefined) {
          const currentElapsedTime =
            timer.elapsedTime + (Date.now() - timer.startTime);
          useGameStore.setState((prevState) => ({
            attackWaveTimers: {
              ...prevState.attackWaveTimers,
              [waveId]: {
                ...prevState.attackWaveTimers![waveId],
                startTime: Date.now(),
                elapsedTime: currentElapsedTime,
              },
            },
          }));
        }
        return false;
      }

      const elapsed = timer.elapsedTime || 0;
      return elapsed >= timer.duration || timer.provoked;
    },

    timeProbability: 0.25,
    priority: 5,
    repeatable: true,
    i18nVars: (state: GameState) => ({
      waveNumber: getPostCompletionWaveNumber(state),
    }),
    effect: (state: GameState): EventChoiceEffectResult => {
      const waveNumber = getPostCompletionWaveNumber(state);
      const def = getPostCompletionWaveParams(waveNumber);
      const enemyStats = calculateEnemyStats(def, state);
      const waveVars = { waveNumber };

      return {
        _combatData: {
          enemy: {
            name: ATTACK_WAVE_ENEMY_NAME,
            ...enemyStats,
          },
          eventTitle:
            resolveEventTitle(waveId, undefined, state, waveVars) ?? "",
          eventMessage: resolveEventMessage(
            waveId,
            undefined,
            state,
            waveVars,
          ),
          onVictory: () => {
            clearPostCompletionAttackWaveTimer();
            return {
              resources: {
                gold: def.goldReward,
              },
              postCompletionAttackWaveCount:
                (state.postCompletionAttackWaveCount ?? 0) + 1,
              _combatSummary: {
                goldReward: def.goldReward,
              },
            };
          },
          onDefeat: () => {
            const defeatResult = handleDefeat(
              state,
              def.buildingDamageMultiplier,
              def.maxCasualties,
              def.fellowshipWoundedMultiplier,
            );
            return {
              ...defeatResult,
              _combatSummary: {
                ...defeatResult._combatSummary,
                madnessGain: undefined,
              },
              attackWaveTimers: {
                ...state.attackWaveTimers,
                [waveId]: {
                  startTime: Date.now(),
                  duration: def.defeatDuration,
                  defeated: false,
                  elapsedTime: 0,
                  provoked: false,
                },
              },
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
  out[POST_COMPLETION_ATTACK_WAVE_ID] = createPostCompletionAttackWaveEvent();
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
