
import { GameEvent } from "./rules/events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

export const caveEvents: Record<string, GameEvent> = {
  ringOfDrownedChoice: {
    id: "ringOfDrownedChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration
    triggerType: "action",
    title: "Ring of Drowned",
    message:
      "In the fogotten city, you find a strange ring that drips constantly with water. Do you keep it?",
    triggered: false,
    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepRing",
        label: "Keep it",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              ring_of_drowned: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                ringOfDrownedChoice: true,
              },
            },
            _logMessage:
              "You slip the ring onto your finger. Water continues to drip from it continuously, never stopping.",
          };
        },
      },
      {
        id: "leaveRing",
        label: "Leave it",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                ringOfDrownedChoice: true,
              },
            },
            _logMessage:
              "You decide the risk is too great. As you turn away, you hear a faint splash behind you, as if something has fallen into deep water, though no water is nearby.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "leaveRing",
      label: "Leave it",
      effect: (state: GameState) => {
        const deathResult = killVillagers(state, 1);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              ringOfDrownedChoice: true,
            },
          },
          _logMessage:
            "Your hesitation proves fatal. One of your men, unable to resist the mysterious ring, picks it up. Immediately, water begins pouring from his mouth in an endless torrent. He drowns on dry land.",
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
      "Deep in the cave you discover a bone flute of disturbing craftsmanship. As you play it, the shadows around you begin to move in unnatural ways, as if dancing to a melody. Do you keep it?",
    triggered: false,
    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepFlute",
        label: "Keep it",
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
        label: "Leave it",
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
      label: "Leave it",
      relevant_stats: ["luck"],
       effect: (state: GameState) => {
        const luck = state.stats.luck || 0;
        const devoured = Math.floor((1 - luck) * Math.random() * 9) + 1;
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
            `Your hesitation proves costly. The shadows grow hungry and violent, writhing with unnatural life. They surge forward and devour ${devoured} members of your fellowship. Their screams echo briefly before being swallowed by silence.`,
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
      "In the throne room of the citadel, you find a magnificent scepter of obsidian. It must have belonged to the king of this lost city. Dark knowledge flows from it. Do you keep it?",
    triggered: false,
    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepScepter",
        label: "Keep it",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              hollow_king_scepter: true,
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
        label: "Leave it",
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
      label: "Leave it",
      effect: (state: GameState) => {
        const luck = state.stats.luck || 0;
        const deaths = Math.floor((1-luck)*Math.random() * 6) + 3;
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
          _logMessage: `As you stand frozen in indecision, your men grow impatient and greedy. One reaches for the scepter, then another. Soon they are fighting viciously. In the bloody melee ${deaths} of your fellowship die, their blood mixing with the dust of ages.`,
        };
      },
    },
  },

  boneDiceChoice: {
    id: "boneDiceChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration
    triggerType: "action",
    title: "The Bone Dice",
    message:
      "As you descend further, you find a set of bone dice carved with ancient runes. These dice have seen much fortune... and much tragedy. Do you keep them?",
    triggered: false,
    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepDice",
        label: "Keep them",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              bone_dice: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                boneDiceChoice: true,
              },
            },
            _logMessage:
              "You pocket the bone dice. They feel warm in your hand, and you sense that fortune will favor you more often, though at what cost remains to be seen.",
          };
        },
      },
      {
        id: "leaveDice",
        label: "Leave them",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                boneDiceChoice: true,
              },
            },
            _logMessage:
              "You decide to leave them on the cave floor. As you walk away, you hear them rattle once, as if rolling themselves in farewell.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "leaveDice",
      label: "Leave them",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              boneDiceChoice: true,
            },
          },
          _logMessage: `Your hesitation seems to anger the ancient magic within the dice. They roll from your hand into the darkness.`,
        };
      },
    },
  },
};
