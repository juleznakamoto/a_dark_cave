import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { markCollectorItemRejectedInSeen } from "./collectorRejectedItems";
import { isSteamEditionActive } from "@/lib/edition";
import { CRUEL_MODE, cruelRangedDeaths } from "../cruelMode";

function createClarityElixirCaveFoundEvent(
  id: string,
  seenKey: string,
): GameEvent {
  return {
    id,
    i18nKey: "clarityElixirCaveFound",
    condition: () => false, // Only triggered by cave exploration
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "drinkElixir",
        effect: (state: GameState) => ({
          stats: {
            ...state.stats,
            madnessFromEvents: (state.stats.madnessFromEvents || 0) - 2,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              [seenKey]: true,
              clarityElixirsUsed:
                (Number(state.story?.seen?.clarityElixirsUsed) || 0) + 1,
            },
          },
          _logMessageKey: "outcome0",
        }),
      },
    ],
  };
}

/** Web Insight granted by cave wall markings, by exploration stage depth. */
export const CAVE_WALL_MARKINGS_INSIGHT: Record<string, number> = {
  caveWallMarkingsExploreCave: 100,
  caveWallMarkingsVentureDeeper: 200,
  caveWallMarkingsDescendFurther: 300,
  caveWallMarkingsExploreRuins: 500,
  caveWallMarkingsExploreTemple: 750,
  caveWallMarkingsExploreCitadel: 1000,
};

/** Steam Insight table (higher than web). */
export const CAVE_WALL_MARKINGS_INSIGHT_STEAM: Record<string, number> = {
  caveWallMarkingsExploreCave: 250,
  caveWallMarkingsVentureDeeper: 500,
  caveWallMarkingsDescendFurther: 750,
  caveWallMarkingsExploreRuins: 1000,
  caveWallMarkingsExploreTemple: 1250,
  caveWallMarkingsExploreCitadel: 1500,
};

export function getCaveWallMarkingsInsight(eventId: string): number {
  const table = isSteamEditionActive()
    ? CAVE_WALL_MARKINGS_INSIGHT_STEAM
    : CAVE_WALL_MARKINGS_INSIGHT;
  return table[eventId] ?? 0;
}

function createCaveWallMarkingsEvent(id: string, seenKey: string): GameEvent {
  return {
    id,
    i18nKey: "caveWallMarkings",
    condition: () => false, // Only triggered by cave exploration
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => {
          const insightAmount = getCaveWallMarkingsInsight(id);
          return {
            resources: {
              ...state.resources,
              insight: (state.resources.insight || 0) + insightAmount,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                [seenKey]: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
    ],
  };
}

export const caveEvents: Record<string, GameEvent> = {
  ringOfDrownedChoice: {
    id: "ringOfDrownedChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration

    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepRing",
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
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveRing",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: markCollectorItemRejectedInSeen(
                {
                  ...state.story.seen,
                  ringOfDrownedChoice: true,
                },
                "ring_of_drowned",
              ),
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "doNothing",
      effect: (state: GameState) => {
        const deathResult = killVillagers(state, 1);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: markCollectorItemRejectedInSeen(
              {
                ...state.story.seen,
                ringOfDrownedChoice: true,
              },
              "ring_of_drowned",
            ),
          },
          _logMessageKey: "outcome2",
        };
      },
    },
  },

  shadowFluteChoice: {
    id: "shadowFluteChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration

    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepFlute",
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
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveFlute",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: markCollectorItemRejectedInSeen(
                {
                  ...state.story.seen,
                  shadowFluteChoice: true,
                },
                "shadow_flute",
              ),
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "doNothing",
      effect: (state: GameState) => {
        const devoured = cruelRangedDeaths(state, CRUEL_MODE.caveTimeout.shadowFlute);
        const deathResult = killVillagers(state, devoured);
        const actualDevoured = deathResult.villagersKilled || 0;
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: markCollectorItemRejectedInSeen(
              {
                ...state.story.seen,
                shadowFluteChoice: true,
              },
              "shadow_flute",
            ),
          },
          _logMessageKey: "outcome2",
          _logMessageVars: { actualDevoured },
        };
      },
    },
  },

  hollowKingScepterChoice: {
    id: "hollowKingScepterChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration

    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepScepter",
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
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveScepter",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: markCollectorItemRejectedInSeen(
                {
                  ...state.story.seen,
                  hollowKingScepterChoice: true,
                },
                "hollow_king_scepter",
              ),
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "doNothing",
      effect: (state: GameState) => {
        const deaths = cruelRangedDeaths(
          state,
          CRUEL_MODE.caveTimeout.hollowKingScepter,
        );
        const deathResult = killVillagers(state, deaths);
        const actualDeaths = deathResult.villagersKilled || 0;
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: markCollectorItemRejectedInSeen(
              {
                ...state.story.seen,
                hollowKingScepterChoice: true,
              },
              "hollow_king_scepter",
            ),
          },
          _logMessageKey: "outcome2",
          _logMessageVars: { actualDeaths },
        };
      },
    },
  },

  bloodstainedBeltChoice: {
    id: "bloodstainedBeltChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration

    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "takeBelt",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              bloodstained_belt: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                bloodstainedBeltChoice: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveBelt",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: markCollectorItemRejectedInSeen(
                {
                  ...state.story.seen,
                  bloodstainedBeltChoice: true,
                },
                "bloodstained_belt",
              ),
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "doNothing",
      effect: (state: GameState) => {
        const deathResult = killVillagers(state, 1);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: markCollectorItemRejectedInSeen(
              {
                ...state.story.seen,
                bloodstainedBeltChoice: true,
              },
              "bloodstained_belt",
            ),
          },
          _logMessageKey: "outcome2",
        };
      },
    },
  },

  boneDiceChoice: {
    id: "boneDiceChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration

    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepDice",
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
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "leaveDice",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: markCollectorItemRejectedInSeen(
                {
                  ...state.story.seen,
                  boneDiceChoice: true,
                },
                "bone_dice",
              ),
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "doNothing",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: markCollectorItemRejectedInSeen(
              {
                ...state.story.seen,
                boneDiceChoice: true,
              },
              "bone_dice",
            ),
          },
          _logMessageKey: "outcome2",
        };
      },
    },
  },

  clarityElixirCaveFoundVentureDeeper: createClarityElixirCaveFoundEvent(
    "clarityElixirCaveFoundVentureDeeper",
    "clarityElixirFoundVentureDeeper",
  ),

  clarityElixirCaveFoundDescendFurther: createClarityElixirCaveFoundEvent(
    "clarityElixirCaveFoundDescendFurther",
    "clarityElixirFoundDescendFurther",
  ),

  clarityElixirCaveFoundExploreRuins: createClarityElixirCaveFoundEvent(
    "clarityElixirCaveFoundExploreRuins",
    "clarityElixirFoundExploreRuins",
  ),

  caveWallMarkingsExploreCave: createCaveWallMarkingsEvent(
    "caveWallMarkingsExploreCave",
    "caveWallMarkingsFoundExploreCave",
  ),

  caveWallMarkingsVentureDeeper: createCaveWallMarkingsEvent(
    "caveWallMarkingsVentureDeeper",
    "caveWallMarkingsFoundVentureDeeper",
  ),

  caveWallMarkingsDescendFurther: createCaveWallMarkingsEvent(
    "caveWallMarkingsDescendFurther",
    "caveWallMarkingsFoundDescendFurther",
  ),

  caveWallMarkingsExploreRuins: createCaveWallMarkingsEvent(
    "caveWallMarkingsExploreRuins",
    "caveWallMarkingsFoundExploreRuins",
  ),

  caveWallMarkingsExploreTemple: createCaveWallMarkingsEvent(
    "caveWallMarkingsExploreTemple",
    "caveWallMarkingsFoundExploreTemple",
  ),

  caveWallMarkingsExploreCitadel: createCaveWallMarkingsEvent(
    "caveWallMarkingsExploreCitadel",
    "caveWallMarkingsFoundExploreCitadel",
  ),
};
