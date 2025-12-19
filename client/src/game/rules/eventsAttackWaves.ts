import type { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { useGameStore } from "@/game/state";

// Helper function to calculate enemy stats
function calculateEnemyStats(
  params: {
    attack: {
      cmBonus: number;
      options: number[];
    };
    health: { base: number; cmBonus: number };
  },
  state: GameState,
) {
  const health = params.health.base + state.CM * params.health.cmBonus;

  // Use options array to select attack value
  const attack =
    params.attack.options[
      Math.floor(Math.random() * params.attack.options.length)
    ] +
    state.CM * params.attack.cmBonus;

  return {
    attack,
    maxHealth: health,
    currentHealth: health,
  };
}

// Attack Wave Parameters
const WAVE_PARAMS = {
  firstWave: {
    attack: { options: [25, 30, 35], cmBonus: 5 },
    health: { base: 300, cmBonus: 50 },
    silverReward: 250,
    initialDuration: 10 * 60 * 1000, // 10 minutes
    defeatDuration: 20 * 60 * 1000, // 20 minutes
    maxCasualties: 5,
    buildingDamageMultiplier: 1,
    fellowshipWoundedMultiplier: 0.1,
  },
  secondWave: {
    attack: { options: [35, 40, 45], cmBonus: 5 },
    health: { base: 400, cmBonus: 50 },
    silverReward: 500,
    initialDuration: 10 * 60 * 1000,
    defeatDuration: 20 * 60 * 1000,
    maxCasualties: 10,
    buildingDamageMultiplier: 2,
    fellowshipWoundedMultiplier: 0.15,
  },
  thirdWave: {
    attack: { options: [45, 50, 55], cmBonus: 10 },
    health: { base: 500, cmBonus: 100 },
    silverReward: 750,
    initialDuration: 10 * 60 * 1000,
    defeatDuration: 20 * 60 * 1000,
    maxCasualties: 15,
    buildingDamageMultiplier: 3,
    fellowshipWoundedMultiplier: 0.2,
  },
  fourthWave: {
    attack: { options: [55, 60, 65], cmBonus: 15 },
    health: { base: 600, cmBonus: 150 },
    silverReward: 1000,
    initialDuration: 10 * 60 * 1000,
    defeatDuration: 20 * 60 * 1000,
    maxCasualties: 20,
    buildingDamageMultiplier: 4,
    fellowshipWoundedMultiplier: 0.25,
  },
  fifthWave: {
    attack: { options: [70, 75, 80, 85], cmBonus: 20 },
    health: { base: 800, cmBonus: 200 },
    silverReward: 1500,
    initialDuration: 15 * 60 * 1000, // 15 minutes
    buildingDamageMultiplier: 5,
    fellowshipWoundedMultiplier: 0.3,
  },
  sixthWave: {
    attack: { options: [90, 95, 100, 105], cmBonus: 25 },
    health: { base: 1000, cmBonus: 250 },
    silverReward: 2000,
    initialDuration: 20 * 60 * 1000, // 20 minutes
    defeatDuration: 25 * 60 * 1000, // 25 minutes
    maxCasualties: 30,
    buildingDamageMultiplier: 6,
    fellowshipWoundedMultiplier: 0.35,
  },
} as const;

const WAVE_CONFIG = {
  firstWave: {
    title: "The First Wave",
    message:
      "Pale figures emerge from the cave, finally freed, their ember eyes cutting through the dark as they march towards the city.",
    enemyName: "Group of creatures",
    condition: (state: GameState) =>
      state.story.seen.portalBlasted &&
      state.buildings.bastion &&
      !state.story.seen.firstWaveVictory,
    triggeredFlag: "firstWaveTriggered" as const,
    victoryFlag: "firstWaveVictory" as const,
  },
  secondWave: {
    title: "The Second Wave",
    message:
      "They creatures return in greater numbers, clad in crude bone, their weapons glowing with foul light.",
    enemyName: "Pack of creatures",
    condition: (state: GameState) =>
      state.story.seen.firstWaveVictory && !state.story.seen.secondWaveVictory,
    triggeredFlag: "secondWaveTriggered" as const,
    victoryFlag: "secondWaveVictory" as const,
  },
  thirdWave: {
    title: "The Third Wave",
    message:
      "Hoards of pale creatures come from the cave, screams shake even the stones, their bone weapons cracking the ground.",
    enemyName: "Horde of creatures",
    condition: (state: GameState) =>
      state.story.seen.wizardDecryptsScrolls &&
      state.story.seen.secondWaveVictory &&
      !state.story.seen.thirdWaveVictory,
    triggeredFlag: null,
    victoryFlag: "thirdWaveVictory" as const,
  },
  fourthWave: {
    title: "The Fourth Wave",
    message:
      "The sky seems to darken as an uncountable mass of pale creatures surges from the cave, pressing towards the city.",
    enemyName: "Legion of creatures",
    condition: (state: GameState) =>
      state.weapons.frostglass_sword &&
      state.story.seen.thirdWaveVictory &&
      !state.story.seen.fourthWaveVictory,
    triggeredFlag: null,
    victoryFlag: "fourthWaveVictory" as const,
  },
  fifthWave: {
    title: "The Final Wave",
    message:
      "From the cave emerge countless pale figures, larger and more twisted than before, their forms unspeakable as they advance on the city.",
    enemyName: "Swarm of creatures",
    condition: (state: GameState) =>
      state.weapons.bloodstone_staff &&
      state.story.seen.fourthWaveVictory &&
      !state.story.seen.fifthWaveVictory,
    triggeredFlag: null,
    victoryFlag: "fifthWaveVictory" as const,
  },
  sixthWave: {
    title: "The Ultimate Confrontation",
    message:
      "From the deepest abyss, the Ancient Harbingers rise. These primordial entities predate existence itself, and they seek to unmake all that has been created.",
    enemyName: "Ancient Harbingers",
    condition: (state: GameState) =>
      state.story.seen.fifthWaveVictory &&
      state.buildings.pillarOfClarity &&
      !state.story.seen.sixthWaveVictory,
    triggeredFlag: null,
    victoryFlag: "sixthWaveVictory" as const,
  },
} as const;

const VICTORY_MESSAGE = (silverReward: number) =>
  `The defenses hold! The pale creatures crash against the walls but cannot break through. You claim ${silverReward} silver from the fallen creatures.`;

const FIFTH_WAVE_VICTORY_MESSAGE = (silverReward: number) =>
  `The final wave has been defeated! The path beyond the shattered portal now lies open. You can venture deeper into the depths to discover what lies beyond. You claim ${silverReward} silver from the fallen creatures.`;

const SIXTH_WAVE_VICTORY_MESSAGE = (silverReward: number) =>
  `The Ancient Harbingers have been vanquished! The fabric of reality is secured, and the world is safe once more. You claim ${silverReward} silver from their remnants.`;

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
    Math.random() * 0.8 * maxCasualties + 0.2 * maxCasualties + state.CM * 5,
  );
  const casualties = Math.min(minCasualities, currentPopulation);
  const deathResult = killVillagers(state, casualties);
  const actualCasualties = deathResult.villagersKilled || 0;

  let buildingDamage = {};
  const damagedBuildings: string[] = [];

  // Probability increases with multiplier (from 10% to 90%)
  const baseChance = Math.min(
    DamageBuildingMultiplier * 0.1 + state.CM * 0.1,
    0.9,
  );

  // helper function for random check
  const chance = (prob: number) => Math.random() < prob;

  // Fellowship wounding logic
  let fellowshipWounded = {};
  const woundedFellows: string[] = [];
  const fellowshipChance = Math.min(
    fellowshipWoundedMultiplier + state.CM * 0.1,
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

  // Bastion damage
  if (
    state.buildings.bastion > 0 &&
    !state.story.seen.bastionDamaged &&
    chance(baseChance)
  ) {
    buildingDamage = { ...buildingDamage, bastionDamaged: true };
    damagedBuildings.push("bastion");
  }

  // Watchtower damage
  if (
    state.buildings.watchtower > 0 &&
    !state.story.seen.watchtowerDamaged &&
    chance(baseChance)
  ) {
    buildingDamage = { ...buildingDamage, watchtowerDamaged: true };
    damagedBuildings.push("watchtower");
  }

  // Palisades damage
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
  };
}

// Factory function to create attack wave events
function createAttackWaveEvent(waveId: keyof typeof WAVE_PARAMS): GameEvent {
  const params = WAVE_PARAMS[waveId];
  const config = WAVE_CONFIG[waveId];

  return {
    id: waveId,
    condition: (state: GameState) => {
      const baseCondition = config.condition(state);

      if (!baseCondition) return false;

      // Initialize timer if it doesn't exist and base conditions are met
      const timer = state.attackWaveTimers?.[waveId];
      if (!timer) {
        // Initialize timer immediately when base conditions are first met
        setTimeout(() => {
          const currentState = useGameStore.getState();
          if (!currentState.attackWaveTimers?.[waveId]) {
            useGameStore.setState({
              attackWaveTimers: {
                ...currentState.attackWaveTimers,
                [waveId]: {
                  startTime: Date.now(),
                  duration: params.initialDuration,
                  defeated: false,
                  provoked: false,
                  elapsedTime: 0, // Initialize elapsedTime
                },
              },
            });
          }
        }, 0);
        return false;
      }

      if (timer.defeated) return false;

      // Don't trigger if game is paused or any dialog is open
      const isDialogOpen =
        state.eventDialog?.isOpen ||
        state.combatDialog?.isOpen ||
        state.authDialogOpen ||
        state.shopDialogOpen ||
        state.leaderboardDialogOpen ||
        state.idleModeDialog?.isOpen;
      const isPaused = state.isPaused || isDialogOpen;

      if (isPaused) {
        // If paused, update elapsedTime without advancing the timer
        if (timer.startTime && timer.elapsedTime !== undefined) {
          const currentElapsedTime = timer.elapsedTime + (Date.now() - timer.startTime);
          useGameStore.setState((prevState) => ({
            attackWaveTimers: {
              ...prevState.attackWaveTimers,
              [waveId]: {
                ...prevState.attackWaveTimers[waveId],
                startTime: Date.now(), // Reset startTime to current time for next calculation
                elapsedTime: currentElapsedTime,
              },
            },
          }));
        }
        return false;
      }

      // Check if timer has expired based on elapsedTime (not Date.now())
      const elapsed = timer.elapsedTime || 0;
      const shouldTrigger = elapsed >= timer.duration || timer.provoked;
      return shouldTrigger;
    },
    triggerType: "resource",
    timeProbability: 0.25,
    title: config.title,
    message: config.message,
    triggered: false,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => {
      const enemyStats = calculateEnemyStats(params, state);

      const storyUpdate = config.triggeredFlag
        ? {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                [config.triggeredFlag]: true,
              },
            },
          }
        : {};

      return {
        ...storyUpdate,
        _combatData: {
          enemy: {
            name: config.enemyName,
            ...enemyStats,
          },
          eventTitle: config.title,
          eventMessage: config.message,
          onVictory: () => ({
            resources: {
              ...state.resources,
              silver: state.resources.silver + params.silverReward,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                [config.victoryFlag]: true,
              },
            },
            attackWaveTimers: {
              ...state.attackWaveTimers,
              [waveId]: {
                ...state.attackWaveTimers[waveId],
                defeated: true,
              },
            },
            _logMessage:
              waveId === "sixthWave"
                ? SIXTH_WAVE_VICTORY_MESSAGE(params.silverReward)
                : waveId === "fifthWave"
                  ? FIFTH_WAVE_VICTORY_MESSAGE(params.silverReward)
                  : VICTORY_MESSAGE(params.silverReward),
          }),
          onDefeat: () => {
            const defeatResult = handleDefeat(
              state,
              params.buildingDamageMultiplier,
              params.maxCasualties,
              params.fellowshipWoundedMultiplier,
            );
            return {
              ...defeatResult,
              attackWaveTimers: {
                ...state.attackWaveTimers,
                [waveId]: {
                  startTime: Date.now(),
                  duration: params.defeatDuration,
                  defeated: false,
                  elapsedTime: 0, // Reset elapsedTime on defeat
                },
              },
              events:
                waveId === "firstWave"
                  ? {
                      ...state.events,
                      firstWave: false, // Reset event triggered state
                    }
                  : state.events,
            };
          },
        },
      };
    },
  };
}

export const attackWaveEvents: Record<string, GameEvent> = {
  firstWave: createAttackWaveEvent("firstWave"),
  secondWave: createAttackWaveEvent("secondWave"),
  thirdWave: createAttackWaveEvent("thirdWave"),
  fourthWave: createAttackWaveEvent("fourthWave"),
  fifthWave: createAttackWaveEvent("fifthWave"),
  sixthWave: createAttackWaveEvent("sixthWave"),
};