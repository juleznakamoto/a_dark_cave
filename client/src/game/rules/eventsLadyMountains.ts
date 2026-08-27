import type { EventChoice, GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getVillagersInVillage } from "@/game/population";
import { CRUEL_MODE, cruelModeScale } from "../cruelMode";

function liquidDeathCasualties(state: GameState): number {
  const pop = getVillagersInVillage(state);
  const floor =
    CRUEL_MODE.ladyMountains.liquidDeathFloor.base +
    cruelModeScale(state) * CRUEL_MODE.ladyMountains.liquidDeathFloor.whenCruel;
  return Math.max(Math.ceil(pop * 0.25), floor);
}

function thirstDeaths(state: GameState): number {
  return (
    CRUEL_MODE.ladyMountains.thirstDeaths.base +
    cruelModeScale(state) * CRUEL_MODE.ladyMountains.thirstDeaths.whenCruel
  );
}

function nightAttackDeaths(state: GameState): number {
  return (
    CRUEL_MODE.ladyMountains.nightAttackDeaths.base +
    cruelModeScale(state) * CRUEL_MODE.ladyMountains.nightAttackDeaths.whenCruel
  );
}

function ambushDeaths(state: GameState): number {
  return (
    CRUEL_MODE.ladyMountains.ambushDeaths.base +
    cruelModeScale(state) * CRUEL_MODE.ladyMountains.ambushDeaths.whenCruel
  );
}

const liquidDeathSearchChoice: EventChoice = {
  id: "searchWoman",
  effect: (state: GameState) => {
    const deaths = thirstDeaths(state);
    const deathResult = killVillagers(state, deaths);
    return {
      ...deathResult,
      story: {
        ...state.story,
        ...(deathResult.story ?? {}),
        seen: {
          ...state.story.seen,
          ...(deathResult.story?.seen ?? {}),
          manFromTheMountainsPending: true,
        },
      },
      _logMessageKey: "searchOutcome",
      _logMessageVars: {
        deaths: deathResult.villagersKilled ?? deaths,
      },
    };
  },
};

const liquidDeathDigWellChoice: EventChoice = {
  id: "digWell",
  cost: "5000 food",
  effect: (state: GameState) => {
    const food = state.resources.food ?? 0;
    if (food < 5000) {
      return { _choiceRejected: true };
    }
    return {
      resources: {
        ...state.resources,
        food: food - 5000,
      },
      stats: {
        ...state.stats,
        madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
      },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          manFromTheMountainsPending: true,
        },
      },
      _logMessageKey: "digWellOutcome",
    };
  },
};

export const ladyMountainsEvents: Record<string, GameEvent> = {
  ladyFromTheMountains: {
    id: "ladyFromTheMountains",
    condition: (state: GameState) =>
      Boolean(state.story?.seen?.sixthWaveVictory) &&
      Boolean(state.story?.seen?.veinrootDiscovered) &&
      !state.story?.seen?.ladyFromTheMountains,
    timeProbability: 10,
    priority: 6,
    repeatable: false,
    choices: [
      {
        id: "welcome",
        effect: (state: GameState) => ({
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              ladyFromTheMountains: true,
              herbGardenUnlocked: true,
              ladyMountainsWelcomed: true,
            },
          },
          _logMessageKey: "welcomeOutcome",
        }),
      },
      {
        id: "sendAway",
        effect: (state: GameState) => ({
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              ladyFromTheMountains: true,
              ladyMountainsPoisonPending: true,
            },
          },
          _logMessageKey: "sendAwayOutcome",
        }),
      },
    ],
  },

  liquidDeath: {
    id: "liquidDeath",
    condition: (state: GameState) => {
      if (state.story?.seen?.liquidDeathResolved) return false;
      const rejectArmed = Boolean(state.story?.seen?.ladyMountainsPoisonPending);
      const welcomeArmed =
        Boolean(state.story?.seen?.ladyMountainsWelcomed) &&
        (state.buildings.herbGarden ?? 0) >= 1;
      return rejectArmed || welcomeArmed;
    },
    timeProbability: 10,
    priority: 7,
    repeatable: false,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    message: (state: GameState) =>
      state.story?.seen?.ladyMountainsWelcomed ? "welcomed" : "rejected",
    i18nVars: (state: GameState) => ({
      deaths: liquidDeathCasualties(state),
    }),
    effect: (state: GameState) => {
      const deaths = liquidDeathCasualties(state);
      const deathResult = killVillagers(state, deaths);
      return {
        ...deathResult,
        story: {
          ...state.story,
          ...(deathResult.story ?? {}),
          seen: {
            ...state.story.seen,
            ...(deathResult.story?.seen ?? {}),
            liquidDeathResolved: true,
            liquidDeathDeaths: deaths,
          },
        },
      };
    },
    choices: [liquidDeathSearchChoice, liquidDeathDigWellChoice],
    fallbackChoice: {
      id: "searchWoman",
      effect: liquidDeathSearchChoice.effect,
    },
  },

  manFromTheMountains: {
    id: "manFromTheMountains",
    condition: (state: GameState) =>
      Boolean(state.story?.seen?.manFromTheMountainsPending) &&
      !state.story?.seen?.manFromTheMountains,
    timeProbability: 0.5,
    priority: 6,
    repeatable: false,
    choices: [
      {
        id: "believeAndHelp",
        effect: (state: GameState) => ({
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              manFromTheMountains: true,
              searchMountainLadyUnlocked: true,
            },
          },
          _logMessageKey: "believeOutcome",
        }),
      },
      {
        id: "sendAway",
        effect: (state: GameState) => ({
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              manFromTheMountains: true,
              mountainPairNightAttackPending: true,
            },
          },
          _logMessageKey: "sendAwayOutcome",
        }),
      },
    ],
  },

  mountainPairNightAttack: {
    id: "mountainPairNightAttack",
    condition: (state: GameState) =>
      Boolean(state.story?.seen?.mountainPairNightAttackPending) &&
      !state.story?.seen?.mountainPairNightAttackDone,
    timeProbability: 10,
    priority: 7,
    repeatable: false,
    i18nVars: (state: GameState) => ({
      deaths: nightAttackDeaths(state),
    }),
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => {
          const deaths = nightAttackDeaths(state);
          const deathResult = killVillagers(state, deaths);
          return {
            ...deathResult,
            tools: {
              ...state.tools,
              mountain_village_map: true,
            },
            story: {
              ...state.story,
              ...(deathResult.story ?? {}),
              seen: {
                ...state.story.seen,
                ...(deathResult.story?.seen ?? {}),
                mountainPairNightAttackDone: true,
                mountainPairNightAttackPending: false,
              },
            },
            _logMessageKey: "outcome",
            _logMessageVars: {
              deaths: deathResult.villagersKilled ?? deaths,
            },
          };
        },
      },
    ],
  },

  /** Opened by Seek Mountain Lady after the ambush resolves. */
  searchMountainLadyAmbush: {
    id: "searchMountainLadyAmbush",
    /** Action-triggered only; never rolled by EventManager. */
    condition: () => false,
    repeatable: false,
    i18nVars: (state: GameState) => ({
      deaths: ambushDeaths(state),
    }),
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => ({
          _logMessageKey: "outcome",
          _logMessageVars: {
            deaths: ambushDeaths(state),
          },
        }),
      },
    ],
  },

  theHoundFound: {
    id: "theHoundFound",
    /** Action-triggered only; never rolled by EventManager. */
    condition: () => false,
    repeatable: false,
    choices: [
      {
        id: "accept",
        effect: (state: GameState) => ({
          fellowship: {
            ...state.fellowship,
            the_hound: true,
          },
          tools: {
            ...state.tools,
            mountain_village_map: false,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              theHoundJoined: true,
              mountainVillageExplored: true,
            },
          },
          _logMessageKey: "outcome",
        }),
      },
    ],
  },
};
