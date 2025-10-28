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
import { calculateTotalEffects } from "@/game/rules/effectsCalculation";
import { calculateBastionStats } from "@/game/bastionStats";
import { getMaxPopulation } from "@/game/population";
import { audioManager } from "@/lib/audio";

// Types
interface GameStore extends GameState {
  // UI state
  activeTab: string;
  devMode: boolean;
  lastSaved: string;
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
  updateResource: (
    resource: keyof GameState["resources"],
    amount: number,
  ) => void;
  setFlag: (flag: keyof GameState["flags"], value: boolean) => void;
  setHoveredTooltip: (tooltipId: string, value: boolean) => void;
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
  assignVillager: (job: keyof GameState["villagers"]) => void;
  unassignVillager: (job: keyof GameState["villagers"]) => void;
  setEventDialog: (isOpen: boolean, event?: LogEntry | null) => void;
  setCombatDialog: (isOpen: boolean, data?: any) => void;
  updateEffects: () => void;
  updateBastionStats: () => void;
}

// Helper functions
const mergeStateUpdates = (
  prevState: GameState,
  stateUpdates: Partial<GameState>,
): Partial<GameState> => {
  console.log("[mergeStateUpdates] Input:", {
    prevStateResources: prevState.resources,
    prevStateBuildings: prevState.buildings,
    stateUpdatesResources: stateUpdates.resources,
    stateUpdatesBuildings: stateUpdates.buildings,
  });

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
    story: stateUpdates.story
      ? {
          ...prevState.story,
          seen: { ...prevState.story.seen, ...stateUpdates.story.seen },
        }
      : prevState.story,
    effects: stateUpdates.effects || prevState.effects,
  };

  console.log("[mergeStateUpdates] Merged result:", {
    mergedResources: merged.resources,
    mergedBuildings: merged.buildings,
  });

  // Calculate and update effects when items change
  if (
    stateUpdates.tools ||
    stateUpdates.weapons ||
    stateUpdates.clothing ||
    stateUpdates.relics
  ) {
    const tempState = { ...prevState, ...merged };
    merged.effects = calculateTotalEffects(tempState);
  }

  return merged;
};

const extractDefaultsFromSchema = (schema: any): any => {
  if (schema._def?.typeName === "ZodObject") {
    const result: any = {};
    const shape = schema._def.shape();

    for (const [key, fieldSchema] of Object.entries(shape)) {
      result[key] = extractDefaultsFromSchema(fieldSchema);
    }
    return result;
  }

  if (schema._def?.typeName === "ZodDefault") {
    const defaultValue = schema._def.defaultValue();
    const innerSchema = schema._def.innerType;

    if (
      typeof defaultValue === "object" &&
      defaultValue !== null &&
      Object.keys(defaultValue).length === 0 &&
      innerSchema._def?.typeName === "ZodObject"
    ) {
      return extractDefaultsFromSchema(innerSchema);
    }
    return defaultValue;
  }

  if (schema._def?.typeName === "ZodNumber") return 0;
  if (schema._def?.typeName === "ZodBoolean") return false;
  if (schema._def?.typeName === "ZodString") return "";
  if (schema._def?.typeName === "ZodArray") return [];
  if (schema._def?.typeName === "ZodRecord") return {};

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
  },
  hoveredTooltips: {},
};

// State management utilities
class StateManager {
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

  static handleDelayedEffects(delayedEffects: Array<() => void> | undefined) {
    if (!delayedEffects) return;

    delayedEffects.forEach((effect) => {
      effect();
    });
  }
}

// Main store
export const useGameStore = create<GameStore>((set, get) => ({
  ...defaultGameState,
  activeTab: "cave",
  devMode: import.meta.env.DEV,
  lastSaved: "Never",
  cooldowns: {},
  log: [],
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
    set((state) => updateResource(state, resource, amount));

    // If updating free villagers, update population counts immediately
    if (resource === ("free" as any)) {
      setTimeout(() => get().updatePopulation(), 0);
    }
  },

  setFlag: (flag: keyof GameState["flags"], value: boolean) => {
    if (import.meta.env.DEV) {
      console.log(`[STATE] Set Flag: ${flag} = ${value}`);
    }

    set((state) => updateFlag(state, flag, value));
  },

  setHoveredTooltip: (tooltipId: string, value: boolean) => {
    set((state) => ({
      hoveredTooltips: {
        ...state.hoveredTooltips,
        [tooltipId]: value,
      },
    }));
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

    if (actionId === "buildStoneHut") {
      console.log("[executeAction] buildStoneHut clicked:", {
        currentStoneHuts: state.buildings.stoneHut,
        currentStone: state.resources.stone,
        cooldown: state.cooldowns[actionId] || 0,
      });
    }

    if (!action || (state.cooldowns[actionId] || 0) > 0) return;
    if (
      !shouldShowAction(actionId, state) ||
      !canExecuteAction(actionId, state)
    )
      return;

    const result = executeGameAction(actionId, state);

    // Apply dev mode cooldown multiplier (0.1x)
    if (state.devMode && result.stateUpdates.cooldowns) {
      const updatedCooldowns = { ...result.stateUpdates.cooldowns };
      for (const key in updatedCooldowns) {
        updatedCooldowns[key] = updatedCooldowns[key] * 0.1;
      }
      result.stateUpdates.cooldowns = updatedCooldowns;
    }

    if (import.meta.env.DEV) {
      console.log(`[STATE] Action: ${actionId}`, {
        stateUpdates: result.stateUpdates,
        logEntries: result.logEntries,
        delayedEffects: result.delayedEffects,
      });
    }

    // Apply state updates
    set((prevState) => {
      if (actionId === "buildStoneHut") {
        console.log("[executeAction] Before merge:", {
          prevStateStoneHuts: prevState.buildings.stoneHut,
          prevStateStone: prevState.resources.stone,
          resultStateUpdates: result.stateUpdates,
          resultStateUpdatesBuildings: result.stateUpdates.buildings,
          resultStateUpdatesResources: result.stateUpdates.resources,
        });
      }

      const mergedUpdates = mergeStateUpdates(prevState, result.stateUpdates);

      if (actionId === "buildStoneHut") {
        console.log("[executeAction] After mergeStateUpdates:", {
          mergedUpdates,
          mergedBuildings: mergedUpdates.buildings,
          mergedResources: mergedUpdates.resources,
        });
      }

      const newState = {
        ...prevState,
        ...mergedUpdates,
        log: result.logEntries
          ? [...prevState.log, ...result.logEntries].slice(-10)
          : prevState.log,
      };

      if (actionId === "buildStoneHut") {
        console.log("[executeAction] Final newState:", {
          stoneHuts: newState.buildings.stoneHut,
          stone: newState.resources.stone,
          buildings: newState.buildings,
          mergedUpdates,
        });
      }

      return newState;
    });

    // Schedule updates
    if (
      result.stateUpdates.tools ||
      result.stateUpdates.weapons ||
      result.stateUpdates.clothing ||
      result.stateUpdates.relics
    ) {
      StateManager.scheduleEffectsUpdate(get);
    }

    // Update bastion stats when fortification buildings change
    if (result.stateUpdates.buildings) {
      const buildingChanges = result.stateUpdates.buildings;
      if (
        buildingChanges.bastion !== undefined ||
        buildingChanges.watchtower !== undefined ||
        buildingChanges.palisades !== undefined
      ) {
        setTimeout(() => get().updateBastionStats(), 0);
      }

      // Update population when housing buildings change
      if (
        buildingChanges.woodenHut !== undefined ||
        buildingChanges.stoneHut !== undefined ||
        buildingChanges.longhouse !== undefined
      ) {
        setTimeout(() => get().updatePopulation(), 0);
      }
    }

    // Handle event dialogs
    if (result.logEntries) {
      result.logEntries.forEach((entry) => {
        if (entry.choices && entry.choices.length > 0) {
          setTimeout(() => get().setEventDialog(true, entry), 100);
        }
      });
    }

    // Handle delayed effects
    StateManager.handleDelayedEffects(result.delayedEffects);
  },

  setCooldown: (action: string, duration: number) => {
    set((state) => ({
      cooldowns: { ...state.cooldowns, [action]: duration },
    }));
  },

  tickCooldowns: () => {
    set((state) => {
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
      message:
        "A dark cave. The air is cold and damp. You barely see the shapes around you.",
      timestamp: Date.now(),
      type: "system",
    };
    get().addLogEntry(initialLogEntry);
  },

  loadGame: async () => {
    const { loadGame: loadFromIDB } = await import('@/game/save');
    const savedState = await loadFromIDB();

    if (savedState) {
      const loadedState = {
        ...savedState,
        activeTab: "cave",
        cooldowns: {},
        log: savedState.log || [],
        events: savedState.events || defaultGameState.events,
        devMode: import.meta.env.DEV,
        effects: calculateTotalEffects(savedState),
        bastion_stats: calculateBastionStats(savedState),
      };
      
      if (import.meta.env.DEV) {
        console.log('[LOAD] Loaded events state:', loadedState.events);
      }
      
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
        message:
          "A dark cave. The air is cold and damp. You barely see the shapes around you.",
        timestamp: Date.now(),
        type: "system",
      };
      get().addLogEntry(initialLogEntry);
    }

    StateManager.scheduleEffectsUpdate(get);
  },

  addLogEntry: (entry: LogEntry) => {
    if (entry.type === "event") {
      audioManager.playSound("event", 0.02);
    }

    set((state) => ({
      log: [...state.log, entry].slice(-10),
    }));
  },

  checkEvents: () => {
    const state = get();
    const { newLogEntries, stateChanges, triggeredEvents } =
      EventManager.checkEvents(state);

    if (newLogEntries.length > 0) {
      let logMessage = null;
      let combatData = null;
      const updatedChanges = { ...stateChanges };

      if (updatedChanges._logMessage) {
        logMessage = updatedChanges._logMessage;
        delete updatedChanges._logMessage;
      }

      if (updatedChanges._combatData) {
        combatData = updatedChanges._combatData;
        delete updatedChanges._combatData;
      }

      set((prevState) => ({
        ...prevState,
        ...updatedChanges,
      }));

      // Show logMessage in dialog if present (with 200ms delay)
      if (logMessage) {
        // Add the log message to the game log immediately
        const logEntry: LogEntry = {
          id: `event-result-${Date.now()}`,
          message: logMessage,
          timestamp: Date.now(),
          type: "system",
        };

        set((prevState) => ({
          ...prevState,
          log: [...prevState.log, logEntry].slice(-10),
        }));

        setTimeout(() => {
          const messageEntry: LogEntry = {
            id: `log-message-${Date.now()}`,
            message: logMessage,
            timestamp: Date.now(),
            type: "event",
            title: newLogEntries[0]?.title, // Use the original event's title
            choices: [
              {
                id: "acknowledge",
                label: "Continue",
                effect: () => ({}),
              },
            ],
            skipSound: true, // Don't play sound for log messages
          };
          get().setEventDialog(true, messageEntry);
        }, 500);
      }

      // Handle combat dialog for attack waves
      if (combatData) {
        get().setCombatDialog(true, {
          enemy: combatData.enemy,
          eventTitle: combatData.eventTitle,
          eventMessage: combatData.eventMessage,
          onVictory: () => {
            const victoryResult = combatData.onVictory();
            // Apply victory state changes
            set((prevState) => ({
              ...prevState,
              ...victoryResult,
              log: victoryResult._logMessage
                ? [
                    ...prevState.log,
                    {
                      id: `combat-victory-${Date.now()}`,
                      message: victoryResult._logMessage,
                      timestamp: Date.now(),
                      type: "system",
                    },
                  ].slice(-10)
                : prevState.log,
            }));
            get().setCombatDialog(false);
          },
          onDefeat: () => {
            const defeatResult = combatData.onDefeat();
            // Apply defeat state changes
            set((prevState) => ({
              ...prevState,
              ...defeatResult,
              log: defeatResult._logMessage
                ? [
                    ...prevState.log,
                    {
                      id: `combat-defeat-${Date.now()}`,
                      message: defeatResult._logMessage,
                      timestamp: Date.now(),
                      type: "system",
                    },
                  ].slice(-10)
                : prevState.log,
            }));
            get().setCombatDialog(false);
          },
        });
      } else {
        // Handle normal event dialogs
        newLogEntries.forEach((entry) => {
          if (entry.choices && entry.choices.length > 0) {
            const currentDialog = get().eventDialog;
            const isMerchantEvent = entry.id.includes("merchant");
            const hasActiveMerchantDialog =
              currentDialog.isOpen &&
              currentDialog.currentEvent?.id.includes("merchant");

            if (!hasActiveMerchantDialog || !isMerchantEvent) {
              get().setEventDialog(true, entry);
            }
          } else {
            // Only add to log if it's not a choice event
            set((prevState) => ({
              log: [...prevState.log, entry].slice(-10),
            }));
          }
        });
      }

      StateManager.schedulePopulationUpdate(get);

      if (triggeredEvents && triggeredEvents.length > 0) {
        const madnessEventIds = [
          "whisperingVoices",
          "shadowsMove",
          "villagerStares",
          "bloodInWater",
          "facesInWalls",
          "wrongVillagers",
          "skinCrawling",
          "creatureInHut",
          "wrongReflections",
          "villagersStareAtSky",
        ];

        const hasMadnessEvent = triggeredEvents.some((event) =>
          madnessEventIds.includes(event.id.split("-")[0]),
        );

        audioManager.playSound(
          hasMadnessEvent ? "eventMadness" : "event",
          0.02,
        );
      }
    }
  },

  applyEventChoice: (choiceId: string, eventId: string) => {
    const state = get();
    const currentLogEntry = get().eventDialog.currentEvent;
    const changes = EventManager.applyEventChoice(
      state,
      choiceId,
      eventId,
      currentLogEntry || undefined,
    );

    let combatData = null;
    let logMessage = null;
    const updatedChanges = { ...changes };

    // Extract combat data if present
    if (updatedChanges._combatData) {
      combatData = updatedChanges._combatData;
      delete updatedChanges._combatData;
    }

    // Extract _logMessage if present
    if (updatedChanges._logMessage) {
      logMessage = updatedChanges._logMessage;
      delete updatedChanges._logMessage;
    }

    // Log cube event updates for debugging
    if (import.meta.env.DEV && updatedChanges.events) {
      console.log('[STATE] Cube event state update:', updatedChanges.events);
    }

    // Apply state changes FIRST - this includes relics, resources, etc.
    if (Object.keys(updatedChanges).length > 0) {
      set((prevState) => {
        const newState = {
          ...prevState,
          ...updatedChanges,
        };
        
        // Ensure events object is properly merged
        if (updatedChanges.events) {
          newState.events = {
            ...prevState.events,
            ...updatedChanges.events,
          };
        }
        
        return newState;
      });

      StateManager.schedulePopulationUpdate(get);
    }

    // Only create a log message dialog if there's a _logMessage but no combat
    // Note: _logMessage is for dialog feedback only, not for the main log
    if (logMessage && !combatData) {
      get().setEventDialog(false);
      setTimeout(() => {
        const messageEntry: LogEntry = {
          id: `log-message-${Date.now()}`,
          message: logMessage,
          timestamp: Date.now(),
          type: "event",
          title: currentLogEntry?.title, // Use the original event's title
          choices: [
            {
              id: "acknowledge",
              label: "Continue",
              effect: () => ({}),
            },
          ],
          skipSound: true, // Don't play sound for log messages
        };
        get().setEventDialog(true, messageEntry);
      }, 200);
      return; // Don't proceed to combat dialog
    }

    // Handle combat dialog
    if (combatData) {
      get().setEventDialog(false);
      get().setCombatDialog(true, {
        enemy: combatData.enemy,
        eventTitle: combatData.eventTitle,
        eventMessage: currentLogEntry?.message || "",
        onVictory: () => {
          const victoryResult = combatData.onVictory();
          set((prevState) => ({
            ...prevState,
            ...victoryResult,
            log: victoryResult._logMessage
              ? [
                  ...prevState.log,
                  {
                    id: `combat-victory-${Date.now()}`,
                    message: victoryResult._logMessage,
                    timestamp: Date.now(),
                    type: "system",
                  },
                ].slice(-10)
              : prevState.log,
          }));
          get().setCombatDialog(false);
        },
        onDefeat: () => {
          const defeatResult = combatData.onDefeat();
          set((prevState) => ({
            ...prevState,
            ...defeatResult,
            log: defeatResult._logMessage
              ? [
                  ...prevState.log,
                  {
                    id: `combat-defeat-${Date.now()}`,
                    message: defeatResult._logMessage,
                    timestamp: Date.now(),
                    type: "system",
                  },
                ].slice(-10)
              : prevState.log,
          }));
          get().setCombatDialog(false);
        },
      });
      return;
    }

    // Dialog closing is now handled in EventDialog component
  },

  toggleDevMode: () => {
    // Dev mode is controlled by NODE_ENV - no-op in production
  },

  assignVillager: (job: keyof GameState["villagers"]) => {
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

  unassignVillager: (job: keyof GameState["villagers"]) => {
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
    return getMaxPopulation(state);
  },

  updatePopulation: () => {
    set((state) => {
      const updates = updatePopulationCounts(state);
      return {
        ...state,
        ...updates,
      };
    });
  },

  // Computed getter for current population
  get current_population() {
    const state = get();
    return Object.values(state.villagers).reduce(
      (sum, count) => sum + (count || 0),
      0,
    );
  },

  setEventDialog: (isOpen: boolean, currentEvent?: LogEntry) => {
    set((state) => ({
      ...state,
      eventDialog: {
        isOpen,
        currentEvent: currentEvent || null,
      },
    }));

    if (isOpen && currentEvent && !currentEvent.skipSound) {
      const eventId = currentEvent.id.split("-")[0];
      const madnessEventIds = [
        "whisperingVoices",
        "shadowsMove",
        "villagerStares",
        "bloodInWater",
        "facesInWalls",
        "wrongVillagers",
        "skinCrawling",
        "creatureInHut",
        "wrongReflections",
        "villagersStareAtSky",
      ];

      const isMadnessEvent = madnessEventIds.includes(eventId);
      audioManager.playSound(isMadnessEvent ? "eventMadness" : "event", 0.02);
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