// estate 1, stone hut 4, 5

import { EventChoice, GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { cruelModeScale } from "../cruelMode";

const mercenaryDemandRefuse: EventChoice = {
  id: "refuse",
  relevant_stats: ["strength"],
  success_chance: (state: GameState) => {
    return calculateSuccessChance(state, 0.1, {
      type: "strength",
      multiplier: 0.005,
    });
  },
  effect: (state: GameState) => {
    const success =
      Math.random() <
      calculateSuccessChance(state, 0.1, {
        type: "strength",
        multiplier: 0.005,
      });

    if (success) {
      return {
        events: {
          ...state.events,
          mercenaryDemand: true,
        },
        _logMessageKey: "outcome1",
      };
    }

    const deaths = 18 + 6 * cruelModeScale(state);
    const deathResult = killVillagers(state, deaths);
    return {
      ...deathResult,
      events: {
        ...state.events,
        mercenaryDemand: true,
      },
      _logMessageKey: "outcome2",
      _logMessageVars: {
        deaths: deathResult.villagersKilled ?? deaths,
      },
    };
  },
};

const mercenaryReturnDemandRefuse: EventChoice = {
  id: "refuse",
  relevant_stats: ["strength"],
  success_chance: (state: GameState) => {
    return calculateSuccessChance(state, 0.1, {
      type: "strength",
      multiplier: 0.005,
    });
  },
  effect: (state: GameState) => {
    const successChance = calculateSuccessChance(state, 0.0, {
      type: "strength",
      multiplier: 0.005,
    });
    const success = Math.random() < successChance;

    if (success) {
      return {
        events: {
          ...state.events,
          mercenaryReturnDemand: true,
        },
        _logMessageKey: "outcome1",
      };
    }

    const deaths = 24 + 6 * cruelModeScale(state);
    const deathResult = killVillagers(state, deaths);
    return {
      ...deathResult,
      events: {
        ...state.events,
        mercenaryReturnDemand: true,
      },
      _logMessageKey: "outcome2",
      _logMessageVars: {
        deaths: deathResult.villagersKilled ?? deaths,
      },
    };
  },
};

export const ringEvents: Record<string, GameEvent> = {
  feedingRing: {
    id: "feedingRing",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      state.buildings.stoneHut >= 4 &&
      !state.clothing.feeding_ring,

    timeProbability: 15,

    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "keepRing",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              feeding_ring: true,
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "removeRing",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              feeding_ring: true,
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },

  bloodiedAwakening: {
    id: "bloodiedAwakening",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      state.buildings.stoneHut >= 5 &&
      state.clothing.feeding_ring,

    timeProbability: 20,

    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "investigateMurders",
        effect: (state: GameState) => {
          const deathResult = killVillagers(state, 18);

          return {
            ...deathResult,
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "severFinger",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              feeding_ring: false,
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },

  desperateAmputation: {
    id: "desperateAmputation",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      state.clothing.feeding_ring &&
      state.events.bloodiedAwakening,

    timeProbability: 5,

    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "severFinger",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              feeding_ring: false,
            },
            _logMessageKey: "outcome0",
          };
        },
      },
    ],
  },

  mercenaryDemand: {
    id: "mercenaryDemand",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      state.buildings.stoneHut >= 6 &&
      !state.clothing.feeding_ring &&
      (state.events.bloodiedAwakening || state.events.desperateAmputation) &&
      !state.events.mercenaryDemand &&
      !state.story.seen.mercenaryDemand_giveRing &&
      !state.story.seen.mercenaryDemand_payGold,

    timeProbability: 60,

    priority: 4,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000, // 5 minutes
    skipEventLog: true,
    fallbackChoice: mercenaryDemandRefuse,
    choices: [
      {
        id: "payGold",
        cost: "100 gold",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 100,
            },
            events: {
              ...state.events,
              mercenaryDemand: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                mercenaryDemand_payGold: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      mercenaryDemandRefuse,
      {
        id: "giveRing",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              mercenaryDemand: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                mercenaryDemand_giveRing: true,
              },
            },
            _logMessageKey: "outcome3",
          };
        },
      },
    ],
  },

  mercenaryReturnDemand: {
    id: "mercenaryReturnDemand",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      state.events.mercenaryDemand &&
      state.story.seen.mercenaryDemand_payGold &&
      !state.events.mercenaryReturnDemand &&
      !state.story.seen.mercenaryReturnDemand_giveRing,

    timeProbability: 30,

    priority: 4,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000, // 5 minutes
    skipEventLog: true,
    fallbackChoice: mercenaryReturnDemandRefuse,
    choices: [
      {
        id: "payGold",
        cost: "200 gold",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 200,
            },
            events: {
              ...state.events,
              mercenaryReturnDemand: true,
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      mercenaryReturnDemandRefuse,
      {
        id: "giveRing",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              mercenaryReturnDemand: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                mercenaryReturnDemand_giveRing: true,
              },
            },
            _logMessageKey: "outcome3",
          };
        },
      },
    ],
  },

  cursedMercenaryMassacre: {
    id: "cursedMercenaryMassacre",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      state.events.mercenaryDemand &&
      state.story.seen.mercenaryDemand_giveRing,

    timeProbability: 5,

    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "nodSilently",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              silver: state.resources.silver + 500,
            },
            _logMessageKey: "outcome0",
          };
        },
      },
    ],
  },
};