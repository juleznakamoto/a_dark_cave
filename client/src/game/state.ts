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
import { calculateTotalEffects } from '@/game/rules/effects';
import { audioManager } from '@/lib/audio';

// Helper function to merge state updates
const mergeStateUpdates = (
  prevState: GameState,
  stateUpdates: Partial<GameState>
): Partial<GameState> => {
  const merged = {
    resources: { ...prevState.resources, ...stateUpdates.resources },
    weapons: { ...prevState.weapons, ...stateUpdates.weapons },
    tools: { ...prevState.tools, ...stateUpdates.tools },
    buildings: { ...prevState.buildings, ...stateUpdates.buildings },
    flags: { ...prevState.flags, ...stateUpdates.flags },
    villagers: { ...prevState.villagers, ...stateUpdates.villagers },
    clothing: { ...prevState.clothing, ...stateUpdates.clothing },
    relics: { ...prevState.relics, ...stateUpdates.relics },
    cooldowns: { ...prevState.cooldowns, ...stateUpdates.cooldowns },
    story: stateUpdates.story ? {
      ...prevState.story,
      seen: { ...prevState.story.seen, ...stateUpdates.story.seen }
    } : prevState.story,
    effects: stateUpdates.effects || prevState.effects,
  };

  // Calculate and update effects when tools, weapons, clothing, or relics change
  if (stateUpdates.tools || stateUpdates.weapons || stateUpdates.clothing || stateUpdates.relics) {
    const tempState = { ...prevState, ...merged };
    merged.effects = calculateTotalEffects(tempState);
  }

  return merged;
};

interface GameStore extends GameState {
  // Production timing
  productionTiming: {
    lastGathererProduction: number;
    lastHunterProduction: number;
    lastConsumption: number;
    currentTime: number;
    interval: number;
  };



  // Actions
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
  addLogEntry: (entry: LogEntry) => void;
  checkEvents: () => void;
  applyEventChoice: (choiceId: string, eventId: string) => void;
  assignVillager: (job: keyof GameState['villagers']) => void;
  unassignVillager: (job: keyof GameState['villagers']) => void;
  setEventDialog: (isOpen: boolean, event?: LogEntry | null) => void;
  updateEffects: () => void;
}

import { gameStateSchema } from "@shared/schema";

// Recursively extract default values from Zod schema structure
const extractDefaultsFromSchema = (schema: any): any => {
  // Handle ZodObject
  if (schema._def?.typeName === 'ZodObject') {
    const result: any = {};
    const shape = schema._def.shape();

    for (const [key, fieldSchema] of Object.entries(shape)) {
      result[key] = extractDefaultsFromSchema(fieldSchema);
    }

    return result;
  }

  // Handle ZodDefault (fields with .default())
  if (schema._def?.typeName === 'ZodDefault') {
    const defaultValue = schema._def.defaultValue();
    const innerSchema = schema._def.innerType;

    // If default is an empty object but inner schema is an object with fields,
    // extract defaults from the inner schema instead
    if (typeof defaultValue === 'object' && defaultValue !== null &&
        Object.keys(defaultValue).length === 0 &&
        innerSchema._def?.typeName === 'ZodObject') {
      return extractDefaultsFromSchema(innerSchema);
    }

    return defaultValue;
  }

  // Handle other primitive types - return appropriate defaults
  if (schema._def?.typeName === 'ZodNumber') return 0;
  if (schema._def?.typeName === 'ZodBoolean') return false;
  if (schema._def?.typeName === 'ZodString') return '';
  if (schema._def?.typeName === 'ZodArray') return [];
  if (schema._def?.typeName === 'ZodRecord') return {};

  // Fallback
  return undefined;
};

// Generate completely dynamic default state from schema
const generateDefaultGameState = (): GameState => {
  return extractDefaultsFromSchema(gameStateSchema) as GameState;
};

// Use the generated default state and ensure effects is properly initialized
const defaultGameState: GameState = {
  ...generateDefaultGameState(),
  effects: {
    resource_bonus: {},
    resource_multiplier: {},
    probability_bonus: {},
    cooldown_reduction: {},
  }
};


export const useGameStore = create<GameStore>((set, get) => ({
  ...defaultGameState,
  activeTab: "cave",
  devMode: import.meta.env.DEV,
  cooldowns: {},
  log: [],
  current_population: 0,
  total_population: 0,
  productionTiming: {
    lastGathererProduction: 0,
    lastHunterProduction: 0,
    lastConsumption: 0,
    currentTime: 0,
    interval: 15000
  },
  eventDialog: {
    isOpen: false,
    currentEvent: null,
  },

  setActiveTab: (tab: string) => {
    set({ activeTab: tab });
  },

  updateResource: (resource: keyof GameState["resources"], amount: number) => {
    console.log(`[STATE] Update Resource: ${resource} by ${amount}`);
    set((state) => {
      const updates = updateResource(state, resource, amount);
      console.log(`[STATE] Resource update result:`, updates);
      return updates;
    });
  },

  setFlag: (flag: keyof GameState["flags"], value: boolean) => {
    console.log(`[STATE] Set Flag: ${flag} = ${value}`);
    set((state) => {
      const updates = updateFlag(state, flag, value);
      console.log(`[STATE] Flag update result:`, updates);
      return updates;
    });
  },

  initialize: (newState: GameState) => {
    const stateWithEffects = {
      ...newState,
      log: newState.log || [],
      effects: newState.effects || calculateTotalEffects(newState),
    };
    set(stateWithEffects);
    // Force update effects after initialization
    setTimeout(() => get().updateEffects(), 0);
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

    // Log state changes for debugging
    console.log(`[STATE] Action: ${actionId}`, {
      stateUpdates: result.stateUpdates,
      logEntries: result.logEntries,
      delayedEffects: result.delayedEffects
    });

    // Apply state updates using helper function
    set((prevState) => {
      const mergedUpdates = mergeStateUpdates(prevState, result.stateUpdates);

      const newState = {
        ...prevState,
        ...mergedUpdates,
        log: result.logEntries
          ? [...prevState.log, ...result.logEntries].slice(-8)
          : prevState.log,
      };

      console.log(`[STATE] New state after ${actionId}:`, newState);
      return newState;
    });

    // Update effects if items/tools/weapons/relics changed
    if (result.stateUpdates.tools || result.stateUpdates.weapons || 
        result.stateUpdates.clothing || result.stateUpdates.relics) {
      setTimeout(() => get().updateEffects(), 0);
    }

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

    // Handle delayed effects (like stranger event for first wooden hut)
    if (result.delayedEffects) {
      result.delayedEffects.forEach((effect) => {
        if (actionId === "buildWoodenHut" && state.buildings.woodenHut === 0) {
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
                const currentPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
                const maxPopulation = (state.buildings.woodenHut * 2) + (state.buildings.stoneHut * 4);

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
    const resetState = {
      ...defaultGameState,
      activeTab: "cave",
      cooldowns: {},
      log: [],
      devMode: import.meta.env.DEV,
      effects: calculateTotalEffects(defaultGameState),
    };
    set(resetState);

    // Force update effects after restart
    setTimeout(() => get().updateEffects(), 0);

    // Then add the initial cave description
    const initialLogEntry: LogEntry = {
      id: "initial-narrative",
      message:
        "A dark cave. The air is cold and damp. You barely see the shapes around you.",
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
      const loadedState = {
        ...savedState,
        activeTab: "cave",
        cooldowns: {},
        log: savedState.log || [],
        devMode: import.meta.env.DEV,
        effects: calculateTotalEffects(savedState),
      };
      set(loadedState);
      // Force update effects after loading
      setTimeout(() => get().updateEffects(), 0);
    } else {
      // For new games, first set the initial state
      const newGameState = {
        ...defaultGameState,
        activeTab: "cave",
        cooldowns: {},
        log: [],
        devMode: import.meta.env.DEV,
        effects: calculateTotalEffects(defaultGameState),
      };
      set(newGameState);

      // Force update effects for new game
      setTimeout(() => get().updateEffects(), 0);

      // Then immediately add the initial cave description
      const initialLogEntry: LogEntry = {
        id: "initial-narrative",
        message:
          "A dark cave. The air is cold and damp. You barely see the shapes around you.",
        timestamp: Date.now(),
        type: "system",
      };

      get().addLogEntry(initialLogEntry);
    }
  },

  addLogEntry: (entry: LogEntry) => {
    // Play event sound for event type log entries
    if (entry.type === 'event') {
      audioManager.playSound('event', 0.3);
    }

    set((state) => ({
      log: [...state.log, entry].slice(-8), // Keep only last 8 entries
    }));
  },

  checkEvents: () => {
    const state = get();
    const { newLogEntries, stateChanges, triggeredEvents } = EventManager.checkEvents(state);

    if (newLogEntries.length > 0) {
      set((prevState) => ({
        ...prevState,
        ...stateChanges,
        log: [...prevState.log, ...newLogEntries].slice(-8),
      }));

      // Check if any new log entry has choices and show event dialog
      newLogEntries.forEach(entry => {
        if (entry.choices && entry.choices.length > 0) {
          const currentDialog = get().eventDialog;
          const isMerchantEvent = entry.id.includes('merchant');
          const hasActiveMerchantDialog = currentDialog.isOpen &&
            currentDialog.currentEvent?.id.includes('merchant');

          // Only open dialog if there's no active merchant dialog, or if this isn't a merchant event
          if (!hasActiveMerchantDialog || !isMerchantEvent) {
            get().setEventDialog(true, entry);
          }
        }
      });

      // Update population after applying changes
      setTimeout(() => get().updatePopulation(), 0);

      // Play event sound for events that trigger automatically
      if (triggeredEvents && triggeredEvents.length > 0) {
        // Check if any triggered event is a madness event
        const madnessEventIds = [
          'whisperingVoices', 'shadowsMove', 'villagerStares', 'bloodInWater',
          'facesInWalls', 'wrongVillagers', 'skinCrawling', 'creatureInHut',
          'wrongReflections', 'villagersStareAtSky'
        ];

        const hasMadnessEvent = triggeredEvents.some(event => 
          madnessEventIds.includes(event.id.split('-')[0])
        );

        if (hasMadnessEvent) {
          audioManager.playSound('eventMadness', 0.4);
        } else {
          audioManager.playSound('event', 0.4);
        }
      }
    }
  },

  applyEventChoice: (choiceId: string, eventId: string) => {
    const state = get();

    // Get the current event dialog log entry for merchant events
    const currentLogEntry = get().eventDialog.currentEvent;

    // Handle other events using EventManager
    const changes = EventManager.applyEventChoice(state, choiceId, eventId, currentLogEntry || undefined);

    if (Object.keys(changes).length > 0) {
      // Handle log messages from choice effects
      let logMessage = null;
      const updatedChanges = { ...changes };

      if (updatedChanges._logMessage) {
        logMessage = updatedChanges._logMessage;
        delete updatedChanges._logMessage;
      }

      set((prevState) => {
        // Apply event effect and get updated state
        const updatedState = { ...prevState, ...changes };

        return {
          ...updatedState,
          log: logMessage
            ? [...prevState.log, { id: `choice-result-${Date.now()}`, message: logMessage, timestamp: Date.now(), type: 'system' }].slice(-8)
            : prevState.log,
        };
      });

      // Close the event dialog (except for merchant trade choices)
      const isMerchantTradeChoice = choiceId.startsWith('trade_') && choiceId !== 'say_goodbye';
      if (!isMerchantTradeChoice) {
        get().setEventDialog(false);
      }

      // Update population after applying changes
      setTimeout(() => {
        get().updatePopulation();
      }, 100);
    } else {
      // Still close the dialog even if no changes
      get().setEventDialog(false);
    }
  },

  toggleDevMode: () => {
    // Dev mode is controlled by NODE_ENV - no-op in production
  },

  assignVillager: (job: keyof GameState['villagers']) => {
    console.log(`[STATE] Assign Villager to: ${job}`);
    set((state) => {
      const updates = assignVillagerToJob(state, job);
      console.log(`[STATE] Villager assignment result:`, updates);
      if (Object.keys(updates).length > 0) {
        setTimeout(() => get().updatePopulation(), 0);
      }
      return updates;
    });
  },

  unassignVillager: (job: keyof GameState['villagers']) => {
    console.log(`[STATE] Unassign Villager from: ${job}`);
    set((state) => {
      const updates = unassignVillagerFromJob(state, job);
      console.log(`[STATE] Villager unassignment result:`, updates);
      if (Object.keys(updates).length > 0) {
        setTimeout(() => get().updatePopulation(), 0);
      }
      return updates;
    });
  },

  getMaxPopulation: () => {
    const state = get();
    return (state.buildings.woodenHut * 2) + (state.buildings.stoneHut * 4); // Wooden huts +2, stone huts +4 each
  },

  updatePopulation: () => {
    set((state) => {
      const updates = updatePopulationCounts(state);
      const currentPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
      const maxPopulation = (state.buildings.woodenHut * 2) + (state.buildings.stoneHut * 4);

      return { 
        ...state, 
        ...updates,
        current_population: currentPopulation,
        total_population: maxPopulation
      };
    });
  },

  setEventDialog: (isOpen: boolean, currentEvent?: LogEntry) => {
    set((state) => ({
      ...state,
      eventDialog: {
        isOpen,
        currentEvent: currentEvent || null,
      },
    }));

    // Play appropriate sound when dialog opens
    if (isOpen && currentEvent) {
      const eventId = currentEvent.id.split('-')[0];
      const madnessEventIds = [
        'whisperingVoices', 'shadowsMove', 'villagerStares', 'bloodInWater',
        'facesInWalls', 'wrongVillagers', 'skinCrawling', 'creatureInHut',
        'wrongReflections', 'villagersStareAtSky'
      ];

      const isMadnessEvent = madnessEventIds.includes(eventId);

      if (isMadnessEvent) {
        audioManager.playSound('eventMadness', 0.4);
      } else {
        audioManager.playSound('event', 0.4);
      }
    }
  },

  updateEffects: () => {
    set((state) => ({
      effects: calculateTotalEffects(state),
    }));
  },


}));