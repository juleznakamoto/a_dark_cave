
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
import { calculateBastionStats } from '@/game/bastionStats';
import { audioManager } from '@/lib/audio';

// Types
interface GameStore extends GameState {
  // Production timing
  productionTiming: {
    lastGathererProduction: number;
    lastHunterProduction: number;
    lastConsumption: number;
    currentTime: number;
    interval: number;
  };

  // UI state
  activeTab: string;
  devMode: boolean;
  eventDialog: {
    isOpen: boolean;
    currentEvent: LogEntry | null;
  };
  combatDialog: {
    isOpen: boolean;
    enemy: any | null;
    eventTitle: string;
    eventMessage: string;
    onVictory: (() => Partial<GameState>) | null;
    onDefeat: (() => Partial<GameState>) | null;
  };

  // Cooldown management
  cooldowns: Record<string, number>;

  // Population helpers
  current_population: number;
  total_population: number;

  // Actions
  executeAction: (actionId: string) => void;
  setActiveTab: (tab: string) => void;
  updateResource: (resource: keyof GameState["resources"], amount: number) => void;
  setFlag: (flag: keyof GameState["flags"], value: boolean) => void;
  initialize: (state: GameState) => void;
  restartGame: () => void;
  loadGame: () => Promise<void>;
  toggleDevMode: () => void;
  getMaxPopulation: () => number;
  updatePopulation: () => void;
  setCooldown: (action: string, duration: number) => void;
  tickCooldowns: () => void;
  addLogEntry: (entry: LogEntry) => void;
  checkEvents: () => void;
  applyEventChoice: (choiceId: string, eventId: string) => void;
  assignVillager: (job: keyof GameState['villagers']) => void;
  unassignVillager: (job: keyof GameState['villagers']) => void;
  setEventDialog: (isOpen: boolean, event?: LogEntry | null) => void;
  setCombatDialog: (isOpen: boolean, data?: any) => void;
  updateEffects: () => void;
  updateBastionStats: () => void;
}

// Helper functions
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

  // Calculate and update effects when items change
  if (stateUpdates.tools || stateUpdates.weapons || stateUpdates.clothing || stateUpdates.relics) {
    const tempState = { ...prevState, ...merged };
    merged.effects = calculateTotalEffects(tempState);
  }

  return merged;
};

const extractDefaultsFromSchema = (schema: any): any => {
  if (schema._def?.typeName === 'ZodObject') {
    const result: any = {};
    const shape = schema._def.shape();

    for (const [key, fieldSchema] of Object.entries(shape)) {
      result[key] = extractDefaultsFromSchema(fieldSchema);
    }
    return result;
  }

  if (schema._def?.typeName === 'ZodDefault') {
    const defaultValue = schema._def.defaultValue();
    const innerSchema = schema._def.innerType;

    if (typeof defaultValue === 'object' && defaultValue !== null &&
        Object.keys(defaultValue).length === 0 &&
        innerSchema._def?.typeName === 'ZodObject') {
      return extractDefaultsFromSchema(innerSchema);
    }
    return defaultValue;
  }

  if (schema._def?.typeName === 'ZodNumber') return 0;
  if (schema._def?.typeName === 'ZodBoolean') return false;
  if (schema._def?.typeName === 'ZodString') return '';
  if (schema._def?.typeName === 'ZodArray') return [];
  if (schema._def?.typeName === 'ZodRecord') return {};

  return undefined;
};

const generateDefaultGameState = (): GameState => {
  return extractDefaultsFromSchema(gameStateSchema) as GameState;
};

const defaultGameState: GameState = {
  ...generateDefaultGameState(),
  effects: {
    resource_bonus: {},
    resource_multiplier: {},
    probability_bonus: {},
    cooldown_reduction: {},
  },
  bastion_stats: {
    defense: 0,
    attack: 0,
    integrity: 0,
  }
};

// State management utilities
class StateManager {
  private static queuedEffectUpdates = new Set<string>();
  private static updateTimer: NodeJS.Timeout | null = null;

  static scheduleEffectsUpdate(store: () => GameStore) {
    if (this.updateTimer) return;
    
    this.updateTimer = setTimeout(() => {
      const state = store();
      state.updateEffects();
      state.updateBastionStats();
      this.updateTimer = null;
    }, 0);
  }

  static schedulePopulationUpdate(store: () => GameStore) {
    setTimeout(() => store().updatePopulation(), 0);
  }

  static handleDelayedEffects(
    delayedEffects: Array<() => void> | undefined,
    actionId: string,
    state: GameState,
    store: () => GameStore
  ) {
    if (!delayedEffects) return;

    delayedEffects.forEach((effect) => {
      if (actionId === "buildWoodenHut" && state.buildings.woodenHut === 0) {
        this.handleStrangerEvent(store);
      } else {
        effect();
      }
    });
  }

  private static handleStrangerEvent(store: () => GameStore) {
    setTimeout(() => {
      const strangerLogEntry: LogEntry = {
        id: `stranger-approaches-${Date.now()}`,
        message: "A stranger approaches through the woods.",
        timestamp: Date.now(),
        type: "system",
      };

      store().addLogEntry(strangerLogEntry);
      
      setTimeout(() => {
        const state = store();
        const currentPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
        const maxPopulation = (state.buildings.woodenHut * 2) + (state.buildings.stoneHut * 4);

        if (currentPopulation < maxPopulation) {
          // Use the store's built-in state update
          const gameStore = store() as any;
          gameStore.setState((prevState: GameState) => ({
            villagers: {
              ...prevState.villagers,
              free: prevState.villagers.free + 1,
            },
            story: {
              ...prevState.story,
              seen: {
                ...prevState.story.seen,
                hasVillagers: true,
              },
            },
          }));
          StateManager.schedulePopulationUpdate(store);
        }
      }, 100);
    }, 2000);
  }
}

// Main store
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
  combatDialog: {
    isOpen: false,
    enemy: null,
    eventTitle: "",
    eventMessage: "",
    onVictory: null,
    onDefeat: null,
  },

  setActiveTab: (tab: string) => set({ activeTab: tab }),

  updateResource: (resource: keyof GameState["resources"], amount: number) => {
    if (import.meta.env.DEV) {
      console.log(`[STATE] Update Resource: ${resource} by ${amount}`);
    }
    
    set((state) => updateResource(state, resource, amount));
  },

  setFlag: (flag: keyof GameState["flags"], value: boolean) => {
    if (import.meta.env.DEV) {
      console.log(`[STATE] Set Flag: ${flag} = ${value}`);
    }
    
    set((state) => updateFlag(state, flag, value));
  },

  initialize: (newState: GameState) => {
    const stateWithEffects = {
      ...newState,
      log: newState.log || [],
      effects: newState.effects || calculateTotalEffects(newState),
      bastion_stats: newState.bastion_stats || calculateBastionStats(newState),
    };
    set(stateWithEffects);
    StateManager.scheduleEffectsUpdate(get);
  },

  executeAction: (actionId: string) => {
    const state = get();
    const action = gameActions[actionId];

    if (!action || ((state.cooldowns[actionId] || 0) > 0 && !state.devMode)) return;
    if (!shouldShowAction(actionId, state) || !canExecuteAction(actionId, state)) return;

    const result = executeGameAction(actionId, state);

    // Apply cooldown override for dev mode
    if (state.devMode) {
      result.stateUpdates.cooldowns = {
        ...result.stateUpdates.cooldowns,
        [actionId]: 0,
      };
    }

    if (import.meta.env.DEV) {
      console.log(`[STATE] Action: ${actionId}`, {
        stateUpdates: result.stateUpdates,
        logEntries: result.logEntries,
        delayedEffects: result.delayedEffects
      });
    }

    // Apply state updates
    set((prevState) => {
      const mergedUpdates = mergeStateUpdates(prevState, result.stateUpdates);
      return {
        ...prevState,
        ...mergedUpdates,
        log: result.logEntries
          ? [...prevState.log, ...result.logEntries].slice(-10)
          : prevState.log,
      };
    });

    // Schedule updates
    if (result.stateUpdates.tools || result.stateUpdates.weapons || 
        result.stateUpdates.clothing || result.stateUpdates.relics ||
        result.stateUpdates.buildings) {
      StateManager.scheduleEffectsUpdate(get);
    }

    // Handle event dialogs
    if (result.logEntries) {
      result.logEntries.forEach(entry => {
        if (entry.choices && entry.choices.length > 0) {
          setTimeout(() => get().setEventDialog(true, entry), 100);
        }
      });
    }

    // Handle delayed effects
    StateManager.handleDelayedEffects(result.delayedEffects, actionId, state, get);
  },

  setCooldown: (action: string, duration: number) => {
    set((state) => ({
      cooldowns: { ...state.cooldowns, [action]: duration },
    }));
  },

  tickCooldowns: () => {
    set((state) => {
      if (state.devMode) return { cooldowns: {} };
      
      const newCooldowns = { ...state.cooldowns };
      for (const key in newCooldowns) {
        if (newCooldowns[key] > 0) {
          newCooldowns[key] = Math.max(0, newCooldowns[key] - 0.2);
        }
      }
      return { cooldowns: newCooldowns };
    });
  },

  restartGame: () => {
    const resetState = {
      ...defaultGameState,
      activeTab: "cave",
      cooldowns: {},
      log: [],
      devMode: import.meta.env.DEV,
      effects: calculateTotalEffects(defaultGameState),
      bastion_stats: calculateBastionStats(defaultGameState),
    };
    set(resetState);
    StateManager.scheduleEffectsUpdate(get);

    const initialLogEntry: LogEntry = {
      id: "initial-narrative",
      message: "A dark cave. The air is cold and damp. You barely see the shapes around you.",
      timestamp: Date.now(),
      type: "system",
    };
    get().addLogEntry(initialLogEntry);
  },

  loadGame: async () => {
    const loadGame = async () => {
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
        bastion_stats: calculateBastionStats(savedState),
      };
      set(loadedState);
    } else {
      const newGameState = {
        ...defaultGameState,
        activeTab: "cave",
        cooldowns: {},
        log: [],
        devMode: import.meta.env.DEV,
        effects: calculateTotalEffects(defaultGameState),
        bastion_stats: calculateBastionStats(defaultGameState),
      };
      set(newGameState);

      const initialLogEntry: LogEntry = {
        id: "initial-narrative",
        message: "A dark cave. The air is cold and damp. You barely see the shapes around you.",
        timestamp: Date.now(),
        type: "system",
      };
      get().addLogEntry(initialLogEntry);
    }
    
    StateManager.scheduleEffectsUpdate(get);
  },

  addLogEntry: (entry: LogEntry) => {
    if (entry.type === 'event') {
      audioManager.playSound('event', 0.02);
    }

    set((state) => ({
      log: [...state.log, entry].slice(-10),
    }));
  },

  checkEvents: () => {
    const state = get();
    const { newLogEntries, stateChanges, triggeredEvents } = EventManager.checkEvents(state);

    if (newLogEntries.length > 0) {
      set((prevState) => ({
        ...prevState,
        ...stateChanges,
        log: [...prevState.log, ...newLogEntries].slice(-10),
      }));

      newLogEntries.forEach(entry => {
        if (entry.choices && entry.choices.length > 0) {
          const currentDialog = get().eventDialog;
          const isMerchantEvent = entry.id.includes('merchant');
          const hasActiveMerchantDialog = currentDialog.isOpen &&
            currentDialog.currentEvent?.id.includes('merchant');

          if (!hasActiveMerchantDialog || !isMerchantEvent) {
            get().setEventDialog(true, entry);
          }
        }
      });

      StateManager.schedulePopulationUpdate(get);

      if (triggeredEvents && triggeredEvents.length > 0) {
        const madnessEventIds = [
          'whisperingVoices', 'shadowsMove', 'villagerStares', 'bloodInWater',
          'facesInWalls', 'wrongVillagers', 'skinCrawling', 'creatureInHut',
          'wrongReflections', 'villagersStareAtSky'
        ];

        const hasMadnessEvent = triggeredEvents.some(event => 
          madnessEventIds.includes(event.id.split('-')[0])
        );

        audioManager.playSound(hasMadnessEvent ? 'eventMadness' : 'event', 0.02);
      }
    }
  },

  applyEventChoice: (choiceId: string, eventId: string) => {
    const state = get();
    const currentLogEntry = get().eventDialog.currentEvent;
    const changes = EventManager.applyEventChoice(state, choiceId, eventId, currentLogEntry || undefined);

    if (Object.keys(changes).length > 0) {
      let logMessage = null;
      let combatData = null;
      const updatedChanges = { ...changes };

      if (updatedChanges._logMessage) {
        logMessage = updatedChanges._logMessage;
        delete updatedChanges._logMessage;
      }

      if (updatedChanges._combatData) {
        combatData = updatedChanges._combatData;
        delete updatedChanges._combatData;
      }

      set((prevState) => {
        const updatedState = { ...prevState, ...updatedChanges };
        return {
          ...updatedState,
          log: logMessage
            ? [...prevState.log, { 
                id: `choice-result-${Date.now()}`, 
                message: logMessage, 
                timestamp: Date.now(), 
                type: 'system' 
              }].slice(-10)
            : prevState.log,
        };
      });

      // Handle combat dialog
      if (combatData) {
        get().setEventDialog(false);
        get().setCombatDialog(true, {
          enemy: combatData.enemy,
          eventTitle: combatData.eventTitle,
          eventMessage: currentLogEntry?.message || "",
          onVictory: combatData.onVictory,
          onDefeat: combatData.onDefeat,
        });
        return;
      }

      const isMerchantTradeChoice = choiceId.startsWith('trade_') && choiceId !== 'say_goodbye';
      if (!isMerchantTradeChoice) {
        get().setEventDialog(false);
      }

      StateManager.schedulePopulationUpdate(get);
    } else {
      get().setEventDialog(false);
    }
  },

  toggleDevMode: () => {
    // Dev mode is controlled by NODE_ENV - no-op in production
  },

  assignVillager: (job: keyof GameState['villagers']) => {
    if (import.meta.env.DEV) {
      console.log(`[STATE] Assign Villager to: ${job}`);
    }
    
    set((state) => {
      const updates = assignVillagerToJob(state, job);
      if (Object.keys(updates).length > 0) {
        StateManager.schedulePopulationUpdate(get);
      }
      return updates;
    });
  },

  unassignVillager: (job: keyof GameState['villagers']) => {
    if (import.meta.env.DEV) {
      console.log(`[STATE] Unassign Villager from: ${job}`);
    }
    
    set((state) => {
      const updates = unassignVillagerFromJob(state, job);
      if (Object.keys(updates).length > 0) {
        StateManager.schedulePopulationUpdate(get);
      }
      return updates;
    });
  },

  getMaxPopulation: () => {
    const state = get();
    return (state.buildings.woodenHut * 2) + (state.buildings.stoneHut * 4);
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

    if (isOpen && currentEvent) {
      const eventId = currentEvent.id.split('-')[0];
      const madnessEventIds = [
        'whisperingVoices', 'shadowsMove', 'villagerStares', 'bloodInWater',
        'facesInWalls', 'wrongVillagers', 'skinCrawling', 'creatureInHut',
        'wrongReflections', 'villagersStareAtSky'
      ];

      const isMadnessEvent = madnessEventIds.includes(eventId);
      audioManager.playSound(isMadnessEvent ? 'eventMadness' : 'event', 0.02);
    }
  },

  setCombatDialog: (isOpen: boolean, data?: any) => {
    set((state) => ({
      ...state,
      combatDialog: {
        isOpen,
        enemy: data?.enemy || null,
        eventTitle: data?.eventTitle || "",
        eventMessage: data?.eventMessage || "",
        onVictory: data?.onVictory || null,
        onDefeat: data?.onDefeat || null,
      },
    }));
  },

  updateEffects: () => {
    set((state) => ({
      effects: calculateTotalEffects(state),
    }));
  },

  updateBastionStats: () => {
    set((state) => ({
      bastion_stats: calculateBastionStats(state),
    }));
  },
}));
