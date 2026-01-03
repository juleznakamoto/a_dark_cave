import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const crowEvents: Record<string, GameEvent> = {
  villageElderCrowMessage: {
    id: "villageElderCrowMessage",
    condition: (state: GameState) => {
      const hasRemainingOptions = (state.villageElderState?.remainingOptions?.length || 0) > 0;
      const noCrowCurrentlySent = 
        !state.story.seen?.crowSentToMonastery &&
        !state.story.seen?.crowSentToSwamp &&
        !state.story.seen?.crowSentToShore;
      return state.fellowship.one_eyed_crow && hasRemainingOptions && noCrowCurrentlySent;
    },
    timeProbability: (state: GameState) => {
      return state.story.seen?.villageElderFirstTime ? 20 : 10;
    },
    title: "The Village Elder's Request",
    message: (state: GameState) => {
      const remaining = state.villageElderState?.remainingOptions || [];
      if (remaining.length < 3) {
        return "The village elder approaches you once more. 'The crow has proven useful. Shall we send another message to establish more connections?'";
      }
      return "A village elder approaches you and recommends sending the crow out with a message to establish trade. Decide where to send a message first.";
    },
    priority: 4,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000,
    skipEventLog: true,
    fallbackChoice: {
      id: "wait",
      label: "Time Expired",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              villageElderFirstTime: true,
            },
          },
          _logMessage:
            "The elder waits for your decision, but you remain undecided. He will return later.",
        };
      },
    },
    choices: [
      {
        id: "mountainMonastery",
        label: "Mountain Monastery",
        effect: (state: GameState) => {
          const remaining = state.villageElderState?.remainingOptions || [];
          if (!remaining.includes("mountain_monastery")) {
            return { _logMessage: "You have already sent a message to the Mountain Monastery." };
          }
          const newRemaining = remaining.filter((o) => o !== "mountain_monastery");
          return {
            villageElderState: {
              ...state.villageElderState,
              remainingOptions: newRemaining,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                villageElderFirstTime: true,
                crowSentToMonastery: true,
              },
            },
            _logMessage:
              "You send the one-eyed crow with a message to the Mountain Monastery. You wait for it to return.",
          };
        },
      },
      {
        id: "swampTribe",
        label: "Swamp Tribe",
        effect: (state: GameState) => {
          const remaining = state.villageElderState?.remainingOptions || [];
          if (!remaining.includes("swamp_tribe")) {
            return { _logMessage: "You have already sent a message to the Swamp Tribe." };
          }
          const newRemaining = remaining.filter((o) => o !== "swamp_tribe");
          return {
            villageElderState: {
              ...state.villageElderState,
              remainingOptions: newRemaining,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                villageElderFirstTime: true,
                crowSentToSwamp: true,
              },
            },
            _logMessage:
              "You send the one-eyed crow with a message to the Swamp Tribe. You wait for it to return.",
          };
        },
      },
      {
        id: "shoreFishermen",
        label: "Shore Fishermen",
        effect: (state: GameState) => {
          const remaining = state.villageElderState?.remainingOptions || [];
          if (!remaining.includes("shore_fishermen")) {
            return { _logMessage: "You have already sent a message to the Shore Fishermen." };
          }
          const newRemaining = remaining.filter((o) => o !== "shore_fishermen");
          return {
            villageElderState: {
              ...state.villageElderState,
              remainingOptions: newRemaining,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                villageElderFirstTime: true,
                crowSentToShore: true,
              },
            },
            _logMessage:
              "You send the one-eyed crow with a message to the Shore Fishermen. You wait for it to return.",
          };
        },
      },
    ],
  },

  monasteryResponse: {
    id: "monasteryResponse",
    condition: (state: GameState) =>
      state.story.seen?.crowSentToMonastery === true,
    timeProbability: 15,
    title: "Message from the Mountain Monastery",
    message:
      "The one-eyed crow returns from the Mountain Monastery with a sealed scroll. The monks offer to sell you a map to a hidden library deep within your cave, containing ancient knowledge. They ask for 250 gold.",
    priority: 5,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000,
    skipEventLog: true,
    fallbackChoice: {
      id: "decline",
      label: "Time Expired",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              crowSentToMonastery: false,
            },
          },
          _logMessage:
            "You took too long to decide. The monks' offer expires.",
        };
      },
    },
    choices: [
      {
        id: "accept",
        label: "Pay 250 Gold",
        cost: "250 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 250) {
            return {
              _logMessage: "You don't have enough gold.",
            };
          }
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 250,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                crowSentToMonastery: false,
                hiddenLibraryUnlocked: true,
              },
            },
            _logMessage:
              "You pay the monks for their map. It reveals the location of a Hidden Library deep in your cave. You can now explore it.",
          };
        },
      },
      {
        id: "decline",
        label: "Decline",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                crowSentToMonastery: false,
              },
            },
            _logMessage:
              "You decline the monks' offer. The opportunity is lost.",
          };
        },
      },
    ],
  },

  swampTribeResponse: {
    id: "swampTribeResponse",
    condition: (state: GameState) =>
      state.story.seen?.crowSentToSwamp === true,
    timeProbability: 15,
    title: "Message from the Swamp Tribe",
    message:
      "The one-eyed crow returns from the Swamp Tribe with a strange token. The tribe offers powerful Chitin Plates in exchange for 1000 steel delivered to their village.",
    priority: 5,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000,
    skipEventLog: true,
    fallbackChoice: {
      id: "decline",
      label: "Time Expired",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              crowSentToSwamp: false,
            },
          },
          _logMessage:
            "You took too long to decide. The tribe's offer expires.",
        };
      },
    },
    choices: [
      {
        id: "accept",
        label: "Accept",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                crowSentToSwamp: false,
                steelDeliveryUnlocked: true,
              },
            },
            _logMessage:
              "You accept the Swamp Tribe's offer. A new expedition 'Steel Delivery' is now available in the forest.",
          };
        },
      },
      {
        id: "decline",
        label: "Decline",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                crowSentToSwamp: false,
              },
            },
            _logMessage:
              "You decline the Swamp Tribe's offer. The opportunity is lost.",
          };
        },
      },
    ],
  },

  shoreFishermenResponse: {
    id: "shoreFishermenResponse",
    condition: (state: GameState) =>
      state.story.seen?.crowSentToShore === true,
    timeProbability: 15,
    title: "Message from the Shore Fishermen",
    message:
      "The one-eyed crow returns from the Shore Fishermen with dried fish as a gift. The fishermen offer to teach you the secrets of building powerful fish traps for 250 gold.",
    priority: 5,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000,
    skipEventLog: true,
    fallbackChoice: {
      id: "decline",
      label: "Time Expired",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              crowSentToShore: false,
            },
          },
          _logMessage:
            "You took too long to decide. The fishermen's offer expires.",
        };
      },
    },
    choices: [
      {
        id: "accept",
        label: "Pay 250 Gold",
        cost: "250 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 250) {
            return {
              _logMessage: "You don't have enough gold.",
            };
          }
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 250,
            },
            blessings: {
              ...state.blessings,
              fishers_hand: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                crowSentToShore: false,
              },
            },
            _logMessage:
              "The fishermen share their ancient techniques. You receive the blessing 'Fisher's Hand' - your gatherers now produce +5 food each.",
          };
        },
      },
      {
        id: "decline",
        label: "Decline",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                crowSentToShore: false,
              },
            },
            _logMessage:
              "You decline the fishermen's offer. The opportunity is lost.",
          };
        },
      },
    ],
  },
};
