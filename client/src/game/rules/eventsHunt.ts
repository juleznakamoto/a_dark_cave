import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const huntEvents: Record<string, GameEvent> = {
  blacksmithHammerChoice: {
    id: "blacksmithHammerChoice",
    condition: (state: GameState) => false, // Only triggered by hunt action
    
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "takeHammer",
        effect: (state: GameState) => {
          return {
            tools: {
              ...state.tools,
              blacksmith_hammer: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                blacksmithHammerChoice: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveHammer",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                blacksmithHammerChoice: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },

  redMaskChoice: {
    id: "redMaskChoice",
    condition: (state: GameState) => false, // Only triggered by hunt action
    
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "takeMask",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              red_mask: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                redMaskChoice: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveMask",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                redMaskChoice: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },
};