import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const crowEvents: Record<string, GameEvent> = {
  establishTradeProposal: {
    id: "establishTradeProposal",
    condition: (state: GameState) => {
      const allCrowsSent = !(
        state.story.seen?.crowSentToMonastery &&
        state.story.seen?.crowSentToSwamp &&
        state.story.seen?.crowSentToShore
      );
      if (state.story.seen?.crowSentToMonastery) {
        if (!state.story.seen?.monasteryResponse) {
          return false;
        }
      }
      if (state.story.seen?.crowSentToSwamp) {
        if (!state.story.seen?.swampTribeResponse) {
          return false;
        }
      }
      if (state.story.seen?.crowSentToShore) {
        if (!state.story.seen?.shoreFishermenResponse) {
          return false;
        }
      }

      return state.fellowship.one_eyed_crow && allCrowsSent;
    },
    timeProbability: (state: GameState) => {
      return state.story.seen?.villageElderFirstTime ? 20 : 10;
    },
    message: (state: GameState) => {
      const count =
        (state.story.seen?.crowSentToMonastery ? 1 : 0) +
        (state.story.seen?.crowSentToSwamp ? 1 : 0) +
        (state.story.seen?.crowSentToShore ? 1 : 0);
      return count > 0 ? "repeat" : "firstTime";
    },
    priority: 4,
    repeatable: true,
    skipEventLog: true,
    choices: (state: GameState) => {
      const choices = [];

      if (!state.story.seen?.crowSentToMonastery) {
        choices.push({
          id: "mountainMonastery",
          effect: (state: GameState) => {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  villageElderFirstTime: true,
                  crowSentToMonastery: true,
                },
              },
              _logMessageKey: "outcome0",
            };
          },
        });
      }

      if (!state.story.seen?.crowSentToSwamp) {
        choices.push({
          id: "swampTribe",
          effect: (state: GameState) => {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  villageElderFirstTime: true,
                  crowSentToSwamp: true,
                },
              },
              _logMessageKey: "outcome1",
            };
          },
        });
      }

      if (!state.story.seen?.crowSentToShore) {
        choices.push({
          id: "shoreFishermen",
          effect: (state: GameState) => {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  villageElderFirstTime: true,
                  crowSentToShore: true,
                },
              },
              _logMessageKey: "outcome2",
            };
          },
        });
      }

      return choices;
    },
  },

  monasteryResponse: {
    id: "monasteryResponse",
    condition: (state: GameState) =>
      state.story.seen?.crowSentToMonastery === true &&
      !state.story.seen?.monasteryResponse,
    timeProbability: 15,
    priority: 5,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000,
    skipEventLog: true,
    fallbackChoice: {
      id: "decline",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              monasteryResponse: true,
            },
          },
          _logMessageKey: "outcome0",
        };
      },
    },
    choices: [
      {
        id: "accept",
        cost: "250 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 250) {
            return {
              _logMessageKey: "outcome1",
            };
          }
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 250,
            },
            tools: {
              ...state.tools,
              hidden_library_map: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                monasteryResponse: true,
              },
            },
            _logMessageKey: "outcome2",
          };
        },
      },
      {
        id: "decline",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                monasteryResponse: true,
              },
            },
            _logMessageKey: "outcome3",
          };
        },
      },
    ],
  },

  swampTribeResponse: {
    id: "swampTribeResponse",
    condition: (state: GameState) =>
      state.story.seen?.crowSentToSwamp === true &&
      !state.story.seen?.swampTribeResponse,
    timeProbability: 15,
    repeatable: true,
    priority: 5,
    skipEventLog: true,
    choices: [
      {
        id: "accept",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                swampTribeResponse: true,
                steelDeliveryUnlocked: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "decline",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                swampTribeResponse: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },

  shoreFishermenResponse: {
    id: "shoreFishermenResponse",
    condition: (state: GameState) =>
      state.story.seen?.crowSentToShore === true &&
      !state.story.seen?.shoreFishermenResponse,
    timeProbability: 15,
    priority: 5,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000,
    skipEventLog: true,
    fallbackChoice: {
      id: "decline",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              shoreFishermenResponse: true,
            },
          },
          _logMessageKey: "outcome0",
        };
      },
    },
    choices: [
      {
        id: "accept",
        cost: "250 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 250) {
            return {
              _logMessageKey: "outcome1",
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
                shoreFishermenResponse: true,
              },
            },
            _logMessageKey: "outcome2",
          };
        },
      },
      {
        id: "decline",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                shoreFishermenResponse: true,
              },
            },
            _logMessageKey: "outcome3",
          };
        },
      },
    ],
  },
};
