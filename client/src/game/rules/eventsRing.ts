// estate 1, stone hut 4, 5

import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

export const ringEvents: Record<string, GameEvent> = {
  feedingRing: {
    id: "feedingRing",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      state.buildings.stoneHut >= 4 &&
      !state.clothing.feedingRing,
    triggerType: "resource",
    timeProbability: 15,
    title: "The Night Terror",
    message:
      "You awaken in the dead of night, paralyzed. You sense a presence looming beside your bed, silent and unmoving. Before terror can take hold, sleep drags you back into the void. At dawn, you find an unfamiliar ring on one of your fingers.",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "keepRing",
        label: "Keep the ring",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              feedingRing: true,
            },
            _logMessage:
              "Your finger aches softly, but you leave it be for now. It almost feels like a faint pulsing against your skin.",
          };
        },
      },
      {
        id: "removeRing",
        label: "Take it off",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              feedingRing: true,
            },
            _logMessage:
              "No matter how hard you try, the ring won't come off. It almost seems fused to your flesh. Your finger aches softly, but you leave it be for now. It almost feels like a faint pulsing against your skin.",
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
      state.clothing.feedingRing,
    triggerType: "resource",
    timeProbability: 15,
    title: "Bloodied Awakening",
    message:
      "You wake as dawn breaks, your clothes soaked in fresh blood. It is not yours. A villager arrives at the estate, face pale with horror. 'Eight are dead,' he whispers. 'Torn apart in the night.' The ring on your finger throbs with agonizing pain.",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "investigateMurders",
        label: "Investigate Murders",
        effect: (state: GameState) => {
          const deathResult = killVillagers(state, 18);

          return {
            ...deathResult,
            _logMessage:
              "As you follow muddy footprints through the village, they lead to each murder scene, one after another. The prints match your own boots. The horror dawns slowly - it was you, possessed by the ring's hunger. When the villagers discover the truth, eighteen flee, unwilling to remain near such a cursed creature.",
          };
        },
      },
      {
        id: "severFinger",
        label: "Sever the finger",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              feedingRing: false,
            },
            _logMessage:
              "With trembling hands, you raise your axe. The ring pulses as the blade falls. Agony tears through your arm as bone shatters. Lifting the severed finger, you see small black threads, like tentacles, sunk deep into its flesh.",
          };
        },
      },
    ],
  },

  desperateAmputation: {
    id: "desperateAmputation",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      state.clothing.feedingRing &&
      state.events.bloodiedAwakening,
    triggerType: "resource",
    timeProbability: 5,
    title: "No Escape",
    message:
      "After the horrifying events, you try once more to remove the cursed ring. But the ring will not yield, as if it has become part of you. There is only one way to be free of it now.",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "severFinger",
        label: "Sever the finger",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              feedingRing: false,
            },
            _logMessage:
              "With trembling hands, you raise your axe. The ring pulses as the blade falls. Agony tears through your arm as bone shatters. Lifting the severed finger, you see small black threads, like tentacles, sunk deep into its flesh.",
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
      !state.clothing.feedingRing &&
      (state.events.bloodiedAwakening || state.events.desperateAmputation),
    triggerType: "resource",
    timeProbability: 60,
    title: "The Mercenary",
    message:
      "A scarred mercenary arrives at the village, hand resting on his blade. 'I’m not here to stir up trouble. Pay me 100 gold, and I'll keep things peaceful. Refuse, and my men will burn this place to the ground.'",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "payGold",
        label: "Pay 100 gold",
        cost: "100 gold",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 100,
            },
            _logMessage:
              "You hand over the gold. The mercenary counts it slowly, a cruel smile on his face. 'Pleasure doing business,' he says, before disappearing.",
          };
        },
      },
      {
        id: "refuse",
        label: "Refuse to pay",
        relevant_stats: ["strength"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.1, {
            type: "strength",
            multiplier: 0.005,
          });
        },
        effect: (state: GameState) => {
          const success = Math.random() < calculateSuccessChance(state, 0.1, {
            type: "strength",
            multiplier: 0.005,
          });

          if (success) {
            return {
              events: {
                ...state.events,
                mercenaryDemand: true,
              },
              _logMessage:
                "The mercenary signals his men to attack. The battle is fierce, but your the villagers prevails. The mercenaries flee into the forest, leaving behind their weapons and wounded.",
            };
          } else {
            const deaths = 18 + 6 * state.CM;
            const deathResult = killVillagers(state, deaths);
            return {
              ...deathResult,
              events: {
                ...state.events,
                mercenaryDemand: true,
              },
              _logMessage:
                `The mercenary signals his men to attack. Despite your best efforts, you are overwhelmed. ${deaths} villagers fall before the mercenaries finally retreat, satisfied with the carnage.`,
            };
          }
        },
      },
      {
        id: "giveRing",
        label: "Give Feeding Ring",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                mercenaryDemand_giveRing: true,
              },
            },
            _logMessage:
              "You offer him the feeding ring you still kept in a locked chest. The mercenary examines it with interest, slipping it onto his own finger. 'A nice ring,' he says, 'but not enough. I'll return tomorrow to collect the gold.'",
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
      state.story.seen.mercenaryDemand_payGold,
    triggerType: "resource",
    timeProbability: 30,
    title: "The Mercenary Returns",
    message:
      "The mercenary is back, and this time he brings more men. 'Times are tough,' he says with a grin. 'The price has gone up. 200 gold, or things get messy.'",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "payGold",
        label: "Pay 200 gold",
        cost: "200 gold",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 200,
            },
            _logMessage:
              "You pay the gold, your hands shaking with rage. The mercenary laughs. 'Smart choice. I won't be bothering you again... probably.' He vanishes into the woods with his men.",
          };
        },
      },
      {
        id: "refuse",
        label: "Refuse to pay",
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
              _logMessage:
                "You refuse. The mercenaries attack, but this time you're ready. After a brutal fight, they scatter into the wilderness, leaving their dead behind.",
            };
          } else {
            const deaths = 24 + 6 * state.CM;
            const deathResult = killVillagers(state, deaths);
            return {
              ...deathResult,
              _logMessage:
                `Your defiance costs you dearly. The mercenaries rampage through the village, killing ${deaths} before they finally depart, laughing at the destruction they've caused.`,
            };
          }
        },
      },
      {
        id: "giveRing",
        label: "Give Feeding Ring",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                mercenaryReturnDemand_giveRing: true,
              },
            },
            _logMessage:
              "You offer him the feeding ring you still kept in a locked chest. The mercenary examines it with interest, slipping it onto his own finger. 'A nice ring,' he says, 'but not enough. I'll return tomorrow to collect the gold.'",
          };
        },
      },
    ],
  },

  cursedMercenaryMassacre: {
    id: "cursedMercenaryMassacre",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      // state.events.mercenaryDemand &&
      state.story.seen.mercenaryDemand_giveRing,
    triggerType: "resource",
    timeProbability: 0.05,
    title: "The Massacre",
    message:
      "A pale villager rushes to you, breathless with terror. 'The mercenary camp... everyone's dead. They killed each other in the night. We found 500 silver among the corpses.' Only you know the truth - the ring fed well.",
    triggered: false,
    priority: 4,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        resources: {
          ...state.resources,
          silver: state.resources.silver + 500,
        },
      };
    },
  },
};