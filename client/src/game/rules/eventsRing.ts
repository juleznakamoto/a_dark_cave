// estate 1, stone hut 4, 5

import type { EventChoice, GameEvent } from "./eventTypes";
import { calculateSuccessChance, defineSuccessChance } from "./eventSuccessChance";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { CRUEL_MODE, cruelModeScale } from "../cruelMode";
import { btpLootAmount } from "@/game/btpLoot";
import { getTrapWinChanceBonus } from "@/game/buildingHierarchy";

const mercenaryDemandRefuse: EventChoice = {
  id: "refuse",
  ...defineSuccessChance({
    base: (state) => 0.1 + getTrapWinChanceBonus(state.buildings),
    stats: [{ type: "strength", multiplier: 0.005 }],
  }),
  effect: (state: GameState) => {
    const success =
      Math.random() <
      calculateSuccessChance(state, 0.1 + getTrapWinChanceBonus(state.buildings), {
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

    const deaths =
      CRUEL_MODE.feedingRing.mercenaryDemand.base +
      cruelModeScale(state) * CRUEL_MODE.feedingRing.mercenaryDemand.whenCruel;
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
  ...defineSuccessChance({
    base: (state) => 0.05 + getTrapWinChanceBonus(state.buildings),
    stats: [{ type: "strength", multiplier: 0.005 }],
  }),
  effect: (state: GameState) => {
    const successChance = calculateSuccessChance(
      state,
      0.05 + getTrapWinChanceBonus(state.buildings),
      {
        type: "strength",
        multiplier: 0.005,
      },
    );
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

    const deaths =
      CRUEL_MODE.feedingRing.mercenaryReturnDemand.base +
      cruelModeScale(state) *
      CRUEL_MODE.feedingRing.mercenaryReturnDemand.whenCruel;
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
          const deaths =
            CRUEL_MODE.feedingRing.bloodiedAwakening.base +
            cruelModeScale(state) *
            CRUEL_MODE.feedingRing.bloodiedAwakening.whenCruel;
          const deathResult = killVillagers(state, deaths);

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
    timedTabDuration: 4 * 60 * 1000,
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
    timedTabDuration: 4 * 60 * 1000,
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
              silver: state.resources.silver + btpLootAmount(500, state),
            },
            _logMessageKey: "outcome0",
          };
        },
      },
    ],
  },
};