import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getMaxVeinfireElixirLimit } from "@/game/resourceLimits";
import { getMapFragmentCount, MAP_FRAGMENT_TOTAL } from "../mapFragments";
import { isSteamEditionActive } from "@/lib/edition";

export const storyEvents: Record<string, GameEvent> = {
  portalDiscovered: {
    id: "portalDiscovered",
    condition: (state: GameState) =>
      state.buildings.alchemistHall >= 1 &&
      state.story.seen.exploredCitadel &&
      !state.story.seen.portalDiscovered,

    timeProbability: 1,
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

  alchemistArrives: {
    id: "alchemistArrives",
    condition: (state: GameState) =>
      state.story.seen.firstWaveVictory &&
      state.buildings.alchemistHall >= 1 &&
      !state.story.seen.alchemistArrives,

    timeProbability: 2,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          alchemistArrives: true,
          canMakeAshfireDust: true,
        },
      },
    }),
  },

  veinrootIntroduction: {
    id: "veinrootIntroduction",
    condition: (state: GameState) =>
      (state.buildings.alchemistHall ?? 0) >= 1 &&
      Boolean(state.story.seen.firstWaveVictory) &&
      !state.story.seen.veinrootDiscovered,
    priority: 7,
    repeatable: false,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => {
          const current = state.resources.veinfire_elixir ?? 0;
          return {
            resources: {
              ...state.resources,
              veinfire_elixir: Math.min(current + 1, getMaxVeinfireElixirLimit()),
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                veinrootDiscovered: true,
              },
            },
          };
        },
      },
    ],
  },

  bloodDrainedVillagers: {
    id: "bloodDrainedVillagers",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 7 && !state.story.seen.collapsedTowerExplored,

    timeProbability: (state: GameState) =>
      state.story.seen.bloodDrainedVillagersFirstTime ? 30 : 45,
    message: (state: GameState) =>
      !state.story.seen.bloodDrainedVillagersFirstTime ? "firstTime" : "repeat",
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => {
          const isFirstTime = !state.story.seen.bloodDrainedVillagersFirstTime;
          const deaths = isFirstTime ? 6 : 8;
          const result = killVillagers(state, deaths);

          return {
            ...result,
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                bloodDrainedVillagersFirstTime: true,
                collapsedTowerUnlocked: true,
              },
            },
          };
        },
      },
    ],
  },

  findElderScroll: {
    id: "findElderScroll",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 6 && !state.relics.elder_scroll,

    timeProbability: 45,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => ({
          relics: {
            ...state.relics,
            elder_scroll: true,
          },
          events: {
            ...state.events,
            elder_scroll_found: true,
          },
          _logMessageKey: "outcome0",
        }),
      },
    ],
  },

  boneyardPlea: {
    id: "boneyardPlea",
    condition: (state: GameState) =>
      Boolean(state.story.seen.firstWaveVictory) &&
      !state.story.seen.boneyardUnlocked,
    timeProbability: 20,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => ({
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              boneyardUnlocked: true,
            },
          },
        }),
      },
    ],
  },

  traderSettles: {
    id: "traderSettles",
    condition: (state: GameState) =>
      !isSteamEditionActive() &&
      (state.buildings.woodenHut ?? 0) >= 5 &&
      !state.story.seen.traderSettled,
    timeProbability: 5,
    priority: 5,
    repeatable: true,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => ({
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              traderSettled: true,
            },
          },
        }),
      },
    ],
  },

  mysteriousNote: {
    id: "mysteriousNote",
    condition: (state: GameState) =>
      state.playTime >= 3 * 60 * 60 * 1000 * 100 && // TODO: This is deactivated for now to allow for testing300 hours in milliseconds
      state.buildings.darkEstate >= 1 &&
      !state.story.seen.mysteriousNoteReceived &&
      !state.hasMadeNonFreePurchase, // Only show if player hasn't made any non-free purchases

    timeProbability: 5,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "throw_away",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                mysteriousNoteReceived: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
    ],
  },

  mysteriousBook: {
    id: "mysteriousBook",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 && !state.books.book_of_ascension,
    timeProbability: 3,
    priority: 5,
    repeatable: true,
    choices: [
      {
        id: "unpack_it",
        effect: (state: GameState) => {
          return {
            books: {
              ...state.books,
              book_of_ascension: true,
            },
            _logMessageKey: "outcome0",
          };
        },
      },
    ],
  },

  wizardArrives: {
    id: "wizardArrives",
    condition: (state: GameState) =>
      state.buildings.bastion >= 1 && !state.story.seen.wizardArrives,

    timeProbability: 0.5,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardArrives: true,
        },
      },
    }),
  },

  wizardNecromancerCastle: {
    id: "wizardNecromancerCastle",
    condition: (state: GameState) =>
      state.buildings.wizardTower >= 1 &&
      !state.story.seen.wizardNecromancerCastle,

    timeProbability: 1.0,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardNecromancerCastle: true,
        },
      },
    }),
  },

  wizardDecryptsScrolls: {
    id: "wizardDecryptsScrolls",
    condition: (state: GameState) =>
      state.relics.ancient_scrolls &&
      state.buildings.wizardTower >= 1 &&
      !state.story.seen.wizardDecryptsScrolls,

    timeProbability: 0.5,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => ({
      relics: {
        ...state.relics,
        ancient_scrolls: false,
      },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardDecryptsScrolls: true,
          wizardHillGrave: true,
        },
      },
    }),
  },

  wizardFrostglassSword: {
    id: "wizardFrostglassSword",
    condition: (state: GameState) =>
      state.story.seen.hillGraveExplored &&
      state.relics.frostglass &&
      !state.story.seen.wizardFrostglassSword,

    timeProbability: 0.5,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardFrostglassSword: true,
        },
      },
    }),
  },

  wizardBloodstone: {
    id: "wizardBloodstone",
    condition: (state: GameState) =>
      state.weapons.frostglass_sword && !state.story.seen.wizardBloodstone,

    timeProbability: 0.02,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardBloodstone: true,
        },
      },
    }),
  },

  wizardBloodstoneStaff: {
    id: "wizardBloodstoneStaff",
    condition: (state: GameState) =>
      state.story.seen.sunkenTempleSuccess &&
      !state.story.seen.wizardBloodstoneStaff,

    timeProbability: 0.5,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardBloodstoneStaff: true,
        },
      },
    }),
  },

  wizardReadyForBattle: {
    id: "wizardReadyForBattle",
    condition: (state: GameState) =>
      state.weapons.bloodstone_staff &&
      state.weapons.frostglass_sword &&
      !state.story.seen.wizardReadyForBattle,

    timeProbability: 0.5,
    priority: 5,
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardReadyForBattle: true,
        },
      },
    }),
  },

  /** After the final siege wave: announces safe passage beyond the blasted gate and unlocks the cave action `encounterBeyondPortal`. */
  beyondGatePassagesClear: {
    id: "beyondGatePassagesClear",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.tenthWaveVictory &&
        state.story.seen.portalBlasted &&
        !state.story.seen.beyondGateVentureUnlocked,
      ),
    timeProbability: 0.01,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => ({
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              beyondGateVentureUnlocked: true,
            },
          },
        }),
      },
    ],
  },

  encounterBeyondPortal: {
    id: "encounterBeyondPortal",
    condition: (state: GameState) =>
      state.story.seen.encounteredBeyondPortal &&
      !state.story.seen.encounteredCreaturesChoice,

    timeProbability: 0.02,
    priority: 5,
    repeatable: true,
    choices: [
      {
        id: "slaughter_creatures",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                slaughteredCreatures: true,
                encounteredCreaturesChoice: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "attempt_communication",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                communicatedWithCreatures: true,
                encounteredCreaturesChoice: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },

  forestTribeHelpRequest: {
    id: "forestTribeHelpRequest",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      !state.story.seen.forestTribeHelpAccepted,
    timeProbability: (state: GameState) =>
      state.story.seen.forestTribeHelpRejected ? 60 : 30,
    priority: 5,
    repeatable: true,
    choices: [
      {
        id: "accept_help",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                forestTribeHelpAccepted: true,
                forestTribeHelpRejected: false,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
    ],
  },

  wildlingBloodOath: {
    id: "wildlingBloodOath",
    condition: (state: GameState) =>
      state.story.seen.forestCaveExplored &&
      !state.story.seen.wildlingBloodOath,
    timeProbability: 2,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "accept_oath",
        effect: (state: GameState) => {
          return {
            fellowship: {
              ...state.fellowship,
              ashwraith_huntress: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                wildlingBloodOath: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
    ],
  },

  ashwraithCanyonTradeOffer: {
    id: "ashwraithCanyonTradeOffer",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.secondWaveVictory == true &&
        state.fellowship.ashwraith_huntress &&
        !state.story.seen.ashwraithCanyonTradeOfferSeen,
      ),
    timeProbability: 20,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => ({
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              ashwraithCanyonTradeOfferSeen: true,
            },
          },
        }),
      },
    ],
  },

  mapFragmentsAssembled: {
    id: "mapFragmentsAssembled",
    timeProbability: 0.05,
    condition: (state: GameState) =>
      !state.story.seen.swampMapAssembled &&
      getMapFragmentCount(state) >= MAP_FRAGMENT_TOTAL,
    priority: 10,
    repeatable: false,
    choices: [
      {
        id: "continue",
        effect: (state: GameState) => ({
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              swampMapAssembled: true,
            },
          },
        }),
      },
    ],
  },
};
