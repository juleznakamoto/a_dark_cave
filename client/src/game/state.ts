import { create } from "zustand";
import { GameState, gameStateSchema } from "@shared/schema";
import { gameActions, shouldShowAction, canExecuteAction } from "@/game/rules";
import { EventManager, LogEntry } from "@/game/rules/events";
import { executeGameAction } from "@/game/actions";
import {
  updateResource,
  updateFlag,
  updatePopulationCounts,
  assignVillagerToJob,
  unassignVillagerFromJob,
} from "@/game/stateHelpers";

interface GameStore extends GameState {
  // Actions
  gatherWood: () => void;
  executeAction: (actionId: string) => void;
  setActiveTab: (tab: string) => void;
  updateResource: (
    resource: keyof GameState["resources"],
    amount: number,
  ) => void;
  setFlag: (flag: keyof GameState["flags"], value: boolean) => void;
  initialize: (state: GameState) => void;
  restartGame: () => void;
  loadGame: () => Promise<void>;
  toggleDevMode: () => void;
  getMaxPopulation: () => number;

  // Population helpers
  current_population: number;
  total_population: number;
  updatePopulation: () => void;

  // UI state
  activeTab: string;
  lastSaved: string;
  isGameLoopActive: boolean;
  devMode: boolean;
  eventDialog: {
    isOpen: boolean;
    currentEvent: LogEntry | null;
  };

  // Cooldown management
  cooldowns: Record<string, number>;
  setCooldown: (action: string, duration: number) => void;
  tickCooldowns: () => void;

  // Event system
  log: LogEntry[];
  events: Record<string, boolean>;
  addLogEntry: (entry: LogEntry) => void;
  checkEvents: () => void;
  applyEventChoice: (choiceId: string, eventId: string) => void;
  assignVillager: (job: "gatherer" | "hunter" | "iron_miner" | "coal_miner" | "sulfur_miner" | "silver_miner" | "gold_miner" | "obsidian_miner" | "adamant_miner" | "moonstone_miner" | "steel_forger") => void;
  unassignVillager: (job: "gatherer" | "hunter" | "iron_miner" | "coal_miner" | "sulfur_miner" | "silver_miner" | "gold_miner" | "obsidian_miner" | "adamant_miner" | "moonstone_miner" | "steel_forger") => void;
  setEventDialog: (isOpen: boolean, event?: LogEntry | null) => void;
}

import { gameStateSchema } from "@shared/schema";

// Generate default state from schema defaults - no more duplication!
const defaultGameState: GameState = gameStateSchema.parse({});

export const useGameStore = create<GameStore>((set, get) => ({
  ...defaultGameState,
  activeTab: "cave",
  lastSaved: "Never",
  isGameLoopActive: false,
  devMode: true,
  cooldowns: {},
  log: [],
  events: {},
  current_population: 0,
  total_population: 0,
  eventDialog: {
    isOpen: false,
    currentEvent: null,
  },

  gatherWood: () => {
    const state = get();
    if ((state.cooldowns["gatherWood"] || 0) > 0 && !state.devMode) return;

    get().executeAction("gatherWood");
  },

  setActiveTab: (tab: string) => {
    set({ activeTab: tab });
  },

  updateResource: (resource: keyof GameState["resources"], amount: number) => {
    set((state) => updateResource(state, resource, amount));
  },

  setFlag: (flag: keyof GameState["flags"], value: boolean) => {
    set((state) => updateFlag(state, flag, value));
  },

  initialize: (newState: GameState) => {
    set({
      ...newState,
      log: newState.log || [],
    });
  },

  executeAction: (actionId: string) => {
    const state = get();
    const action = gameActions[actionId];

    if (!action || ((state.cooldowns[actionId] || 0) > 0 && !state.devMode))
      return;
    if (
      !shouldShowAction(actionId, state) ||
      !canExecuteAction(actionId, state)
    )
      return;

    const result = executeGameAction(actionId, state);

    // Apply cooldown override for dev mode
    if (state.devMode) {
      result.stateUpdates.cooldowns = {
        ...result.stateUpdates.cooldowns,
        [actionId]: 0,
      };
    }

    // Apply state updates
    set((prevState) => ({
      ...prevState,
      ...result.stateUpdates,
      log: result.logEntries
        ? [...prevState.log, ...result.logEntries].slice(-8)
        : prevState.log,
    }));

    // Check if any new log entry has choices and show event dialog
    if (result.logEntries) {
      result.logEntries.forEach(entry => {
        if (entry.choices && entry.choices.length > 0) {
          setTimeout(() => {
            get().setEventDialog(true, entry);
          }, 100);
        }
      });
    }

    // Handle delayed effects (like stranger event for first hut)
    if (result.delayedEffects) {
      result.delayedEffects.forEach((effect) => {
        if (actionId === "buildHut" && state.buildings.hut === 0) {
          setTimeout(() => {
            const strangerLogEntry: LogEntry = {
              id: `stranger-approaches-${Date.now()}`,
              message: "A stranger approaches through the woods.",
              timestamp: Date.now(),
              type: "system",
            };

            get().addLogEntry(strangerLogEntry);
            setTimeout(() => {
              set((state) => {
                const currentPopulation =
                  state.villagers.free +
                  state.villagers.gatherer +
                  state.villagers.hunter;
                const maxPopulation = state.buildings.hut * 2;

                if (currentPopulation < maxPopulation) {
                  const newState = {
                    villagers: {
                      ...state.villagers,
                      free: state.villagers.free + 1,
                    },
                    story: {
                      ...state.story,
                      seen: {
                        ...state.story.seen,
                        hasVillagers: true,
                      },
                    },
                  };
                  setTimeout(() => get().updatePopulation(), 0);
                  return newState;
                }
                return state;
              });
            }, 100);
          }, 2000);
        } else {
          // Execute other delayed effects
          effect();
        }
      });
    }
  },

  setCooldown: (action: string, duration: number) => {
    set((state) => ({
      cooldowns: { ...state.cooldowns, [action]: duration },
    }));
  },

  tickCooldowns: () => {
    set((state) => {
      if (state.devMode) return { cooldowns: {} }; // Clear all cooldowns in dev mode
      const newCooldowns = { ...state.cooldowns };
      for (const key in newCooldowns) {
        if (newCooldowns[key] > 0) {
          newCooldowns[key] = Math.max(0, newCooldowns[key] - 0.2); // Tick down by 200ms
        }
      }
      return { cooldowns: newCooldowns };
    });
  },

  restartGame: () => {
    // First clear the state
    set({
      ...defaultGameState,
      activeTab: "cave",
      lastSaved: "Never",
      cooldowns: {},
      log: [],
      events: {},
      devMode: true,
    });

    // Then add the initial cave description
    const initialLogEntry: LogEntry = {
      id: "initial-narrative",
      message:
        "A dark cave. The air is cold and stale. You can barely make out the shapes around you.",
      timestamp: Date.now(),
      type: "system",
    };

    get().addLogEntry(initialLogEntry);
  },

  loadGame: async () => {
    // Placeholder for actual game loading logic
    const loadGame = async () => {
      // In a real scenario, this would fetch saved game data from local storage or an API
      // For demonstration purposes, we'll simulate loading a saved game or starting a new one
      const savedState = localStorage.getItem("gameState");
      return savedState ? JSON.parse(savedState) : null;
    };

    const savedState = await loadGame();

    if (savedState) {
      set({
        ...savedState,
        activeTab: "cave",
        lastSaved: "Loaded",
        cooldowns: {},
        events: savedState.events || get().events,
        log: savedState.log || [],
        devMode: true, // Ensure devMode is always true
      });
    } else {
      // For new games, first set the initial state
      set({
        ...defaultGameState,
        activeTab: "cave",
        lastSaved: "Never",
        cooldowns: {},
        log: [],
        events: {},
        devMode: true,
      });

      // Then immediately add the initial cave description
      const initialLogEntry: LogEntry = {
        id: "initial-narrative",
        message:
          "A dark cave. The air is cold and stale. You can barely make out the shapes around you.",
        timestamp: Date.now(),
        type: "system",
      };

      get().addLogEntry(initialLogEntry);
    }
  },

  addLogEntry: (entry: LogEntry) => {
    set((state) => ({
      log: [...state.log, entry].slice(-8), // Keep only last 8 entries
    }));
  },

  checkEvents: () => {
    const state = get();
    const { newLogEntries, stateChanges } = EventManager.checkEvents(state);

    if (newLogEntries.length > 0) {
      set((prevState) => ({
        ...prevState,
        ...stateChanges,
        log: [...prevState.log, ...newLogEntries].slice(-8),
        events: {
          ...prevState.events,
          ...newLogEntries.reduce(
            (acc, entry) => {
              const eventId = entry.id.split("-")[0];
              acc[eventId] = true;
              return acc;
            },
            {} as Record<string, boolean>,
          ),
        },
      }));

      // Check if any new log entry has choices and show event dialog
      newLogEntries.forEach(entry => {
        if (entry.choices && entry.choices.length > 0) {
          get().setEventDialog(true, entry);
        }
      });

      // Update population after applying changes
      setTimeout(() => get().updatePopulation(), 0);
    }
  },

  applyEventChoice: (choiceId: string, eventId: string) => {
    const state = get();

    // Handle trinket event choices directly
    if (eventId.startsWith('trinketFound')) {
      if (choiceId === 'drinkTrinket') {
        // Apply immediate effects including strength bonus
        set((prevState) => ({
          ...prevState,
          flags: {
            ...prevState.flags,
            trinketDrunk: true,
          },
          triggeredEvents: {
            ...prevState.triggeredEvents,
            trinket_found: true,
          },
          stats: {
            ...prevState.stats,
            strength: (prevState.stats.strength || 0) + 5,
          },
        }));

        // Add immediate log message with strength bonus
        get().addLogEntry({
          id: `trinket-drink-${Date.now()}`,
          message: "You drink the amber liquid. It burns as it goes down, but you feel stronger than before. (+5 Strength)",
          timestamp: Date.now(),
          type: 'system',
        });

        get().setEventDialog(false);
        return;
      } else if (choiceId === 'ignoreTrinket') {
        set((prevState) => ({
          ...prevState,
          triggeredEvents: {
            ...prevState.triggeredEvents,
            trinket_found: true,
          },
        }));

        get().addLogEntry({
          id: `trinket-ignore-${Date.now()}`,
          message: "You decide not to risk drinking the mysterious liquid. You carefully bury the trinket back where you found it and continue gathering wood.",
          timestamp: Date.now(),
          type: 'system',
        });

        get().setEventDialog(false);
        return;
      }
    }

    // Handle other events using EventManager
    const changes = EventManager.applyEventChoice(state, choiceId, eventId);

    if (Object.keys(changes).length > 0) {
      // Handle log messages from choice effects
      let logMessage = null;
      const updatedChanges = { ...changes };

      if (updatedChanges._logMessage) {
        logMessage = updatedChanges._logMessage;
        delete updatedChanges._logMessage;
      }

      set((prevState) => ({
        ...prevState,
        ...updatedChanges,
      }));

      // Add log message if present
      if (logMessage) {
        get().addLogEntry({
          id: `choice-result-${Date.now()}`,
          message: logMessage,
          timestamp: Date.now(),
          type: 'system',
        });
      }

      // Close the event dialog
      get().setEventDialog(false);

      // Update population after applying changes - ensure it happens after state update
      setTimeout(() => {
        get().updatePopulation();
      }, 100);
    }
  },

  toggleDevMode: () => {
    // Dev mode is always enabled - no-op
  },

  assignVillager: (job: "gatherer" | "hunter" | "iron_miner" | "coal_miner" | "sulfur_miner" | "silver_miner" | "gold_miner" | "obsidian_miner" | "adamant_miner" | "moonstone_miner" | "steel_forger") => {
    set((state) => {
      const updates = assignVillagerToJob(state, job);
      if (Object.keys(updates).length > 0) {
        setTimeout(() => get().updatePopulation(), 0);
      }
      return updates;
    });
  },

  unassignVillager: (job: "gatherer" | "hunter" | "iron_miner" | "coal_miner" | "sulfur_miner" | "silver_miner" | "gold_miner" | "obsidian_miner" | "adamant_miner" | "moonstone_miner" | "steel_forger") => {
    set((state) => {
      const updates = unassignVillagerFromJob(state, job);
      if (Object.keys(updates).length > 0) {
        setTimeout(() => get().updatePopulation(), 0);
      }
      return updates;
    });
  },

  getMaxPopulation: () => {
    const state = get();
    return state.buildings.hut * 2; // Each hut provides +2 max population
  },

  updatePopulation: () => {
    set((state) => ({ ...state, ...updatePopulationCounts(state) }));
  },

  setEventDialog: (isOpen: boolean, event?: LogEntry | null) => {
    set({
      eventDialog: {
        isOpen,
        currentEvent: event || null,
      },
    });
  },
}));