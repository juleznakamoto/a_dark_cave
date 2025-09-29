
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

export const caveEvents: Record<string, GameEvent> = {
  coinOfDrownedChoice: {
    id: "coinOfDrownedChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration
    triggerType: "action",
    title: "The Coin of Drowned",
    message:
      "Among the rubble of the fogotten city, you find a peculiar ring that drips constantly with water, despite there being no source. Do you dare to keep it?",
    triggered: false,
    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepCoin",
        label: "Keep the ring",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              coin_of_drowned: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                coinOfDrownedChoice: true,
              },
            },
            _logMessage:
              "You slip the ring onto your finger. Water continues to drip from it continuously, never stopping.",
          };
        },
      },
      {
        id: "leaveCoin",
        label: "Leave it behind",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                coinOfDrownedChoice: true,
              },
            },
            _logMessage:
              "You decide the risk is too great. As you turn away, you hear a faint splash behind you, as if something has fallen into deep water, though no water is nearby.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "leaveCoin",
      label: "Leave it behind",
      effect: (state: GameState) => {
        const deathResult = killVillagers(state, 1);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              coinOfDrownedChoice: true,
            },
          },
          _logMessage:
            "Your hesitation proves fatal. One of your men, unable to resist the mysterious ring's pull, picks it up despite your indecision. Immediately, water begins pouring from his mouth in an endless torrent. He drowns on dry land as the cursed ring claims its price.",
        };
      },
    },
  },

  shadowFluteChoice: {
    id: "shadowFluteChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration
    triggerType: "action",
    title: "The Shadow Flute",
    message:
      "You discover a bone flute of disturbing craftsmanship. When you pick it up and play it, the shadows around you begin to move in unnatural ways, as if dancing to a melody. Do you keep the instrument?",
    triggered: false,
    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepFlute",
        label: "Keep the flute",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              shadow_flute: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                shadowFluteChoice: true,
              },
            },
            _logMessage:
              "You keep the bone flute. Its tunes are beautiful, yet there's a subtle dissonance that gnaws quietly at your mind.",
          };
        },
      },
      {
        id: "leaveFlute",
        label: "Leave it behind",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                shadowFluteChoice: true,
              },
            },
            _logMessage:
              "You set the flute back down carefully. The shadows return to their natural stillness, and the oppressive atmosphere lifts.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "leaveFlute",
      label: "Leave it behind",
      effect: (state: GameState) => {
        const devoured = Math.floor(Math.random() * 3) + 2; // 2-4 villagers
        const deathResult = killVillagers(state, devoured);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              shadowFluteChoice: true,
            },
          },
          _logMessage:
            "Your hesitation proves costly. The shadows grow hungry and violent, writhing with unnatural life. They surge forward and devour 2 members of your fellowship, pulling them into the darkness between worlds. Their screams echo briefly before being swallowed by silence.",
        };
      },
    },
  },

  hollowKingScepterChoice: {
    id: "hollowKingScepterChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration
    triggerType: "action",
    title: "The Hollow King Scepter",
    message:
      "In the throne room of the ruined citadel, you find a magnificent scepter of obsidian. This must have belonged to the king of this lost city. Dark knowledge flows from it, but so does terrible madness. Do you keep it?",
    triggered: false,
    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepScepter",
        label: "Claim the scepter",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              hollow_King_scepter: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                hollowKingScepterChoice: true,
              },
            },
            _logMessage:
              "You grasp the Hollow King Scepter, feeling immense power flow through you. Ancient knowledge floods your mind, along with the King memories of his final, maddening days.",
          };
        },
      },
      {
        id: "leaveScepter",
        label: "Leave the throne undisturbed",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                hollowKingScepterChoice: true,
              },
            },
            _logMessage:
              "You decide to leave the dead King scepter where it belongs. As you turn away, you swear you hear a faint whisper of disappointment echoing through the empty throne room.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "leaveScepter",
      label: "Leave the throne undisturbed",
      effect: (state: GameState) => {
        const deaths = Math.floor(Math.random() * 5) + 4; // 4-8 villagers
        const deathResult = killVillagers(state, deaths);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              hollowKingScepterChoice: true,
            },
          },
          _logMessage:
            `As you stand frozen in indecision, your men grow impatient and greedy. One reaches for the scepter, then another. Soon they are fighting viciously over who should claim it. In the bloody melee that follows ${deaths} of your fellowship lie dead on the ancient throne room floor, their blood mixing with the dust of ages.`,
        };
      },
    },
  },

  dragonBoneDiceChoice: {
    id: "dragonBoneDiceChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration
    triggerType: "action",
    title: "The Dragon Bone Dice",
    message:
      "As you descend further, you find a set of dragon bone dice carved with ancient runes. Rolling them in your palm, you feel a surge of luck, but a subtle unease lingers. These dice have seen much fortune... and much tragedy. Do you keep them?",
    triggered: false,
    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepDice",
        label: "Keep the dice",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              dragon_bone_dice: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                dragonBoneDiceChoice: true,
              },
            },
            _logMessage:
              "You pocket the dragon bone dice. They feel warm in your hand, and you sense that fortune will favor you more often, though at what cost remains to be seen.",
          };
        },
      },
      {
        id: "leaveDice",
        label: "Leave them behind",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                dragonBoneDiceChoice: true,
              },
            },
            _logMessage:
              "You decide the dice carry too much risk and leave them on the cave floor. As you walk away, you hear them rattle once, as if rolling themselves in farewell.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "leaveDice",
      label: "Leave them behind",
      effect: (state: GameState) => {
        const cursed = Math.floor(Math.random() * 2) + 1; // 1-2 villagers
        const deathResult = killVillagers(state, cursed);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              dragonBoneDiceChoice: true,
            },
          },
          _logMessage:
            `Your hesitation angers the ancient magic within the dice. They begin rolling on their own, each result bringing misfortune. ${cursed} of your men suddenly collapse, victims of the dice's terrible curse. The bones finally stop rolling, their revenge complete.`,
        };
      },
    },
  },

  portalDiscovered: {
    id: "portalDiscovered",
    condition: (state: GameState) =>
      state.buildings.alchemistTower >= 1 &&
      state.flags.exploredCitadel &&
      !state.story.seen.portalDiscovered,
    triggerType: "resource",
    timeProbability: 1, // Triggers immediately when conditions are met
    message:
      "In the citadel’s lowest depths stands a colossal portal forged from an unknown, unyielding metal. Its sheer sturdiness suggests it was built to keep something trapped within. Perhaps only the fury of fire can shatter its seal.",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          portalDiscovered: true,
        },
      },
    }),
  },
};
