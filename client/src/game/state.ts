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
  boostMode: boolean;
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
  authDialogOpen: boolean;
  shopDialogOpen: boolean;
  showEndScreen: boolean; // Added showEndScreen flag

  // Cooldown management
  cooldowns: Record<string, number>;
  cooldownDurations: Record<string, number>; // Track initial duration for each cooldown

  // Population helpers
  current_population: number;
  total_population: number;

  // Game loop state
  loopProgress: number; // 0-100 representing progress through the 15s production cycle
  isGameLoopActive: boolean;
  isPaused: boolean; // New state for pause/unpause

  // Actions
  executeAction: (actionId: string) => void;
  setActiveTab: (tab: string) => void;
  setBoostMode: (enabled: boolean) => void;
  setShowEndScreen: (showEndScreen: boolean) => void; // Added setShowEndScreen action
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
  setAuthDialogOpen: (isOpen: boolean) => void;
  setShopDialogOpen: (isOpen: boolean) => void;
  updateEffects: () => void;
  updateBastionStats: () => void;
  updateLoopProgress: (progress: number) => void;
  setGameLoopActive: (isActive: boolean) => void;
  togglePause: () => void;
  toggleMute: () => void; // New method to toggle mute state
  isMuted: () => boolean; // New method to check mute state
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
    cooldownDurations: { ...prevState.cooldownDurations, ...stateUpdates.cooldownDurations }, // Merge cooldownDurations
    story: stateUpdates.story
      ? {
          ...prevState.story,
          seen: { ...prevState.story.seen, ...stateUpdates.story.seen },
        }
      : prevState.story,
    effects: stateUpdates.effects || prevState.effects,
    // Merge loop-related states if they are part of stateUpdates
    loopProgress: stateUpdates.loopProgress !== undefined ? stateUpdates.loopProgress : prevState.loopProgress,
    isGameLoopActive: stateUpdates.isGameLoopActive !== undefined ? stateUpdates.isGameLoopActive : prevState.isGameLoopActive,
    isPaused: stateUpdates.isPaused !== undefined ? stateUpdates.isPaused : prevState.isPaused, // Merge isPaused
    showEndScreen: stateUpdates.showEndScreen !== undefined ? stateUpdates.showEndScreen : prevState.showEndScreen, // Merge showEndScreen
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
  feastState: {
    isActive: false,
    endTime: 0,
    lastAcceptedLevel: 0,
  },
  greatFeastState: {
    isActive: false,
    endTime: 0,
  },
  curseState: {
    isActive: false,
    endTime: 0,
  },
  activatedPurchases: {},
  feastPurchases: {}, // Track individual feast purchases: { purchaseId: { itemId, activationsRemaining, totalActivations } }
  // Initialize game loop state
  loopProgress: 0,
  isGameLoopActive: false,
  isPaused: false,
  showEndScreen: false, // Initialize showEndScreen to false
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
  boostMode: false,
  lastSaved: "Never",
  cooldowns: {},
  cooldownDurations: {}, // Initialize cooldownDurations
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
  authDialogOpen: false,
  shopDialogOpen: false,
  showEndScreen: false, // Initialize showEndScreen

  setActiveTab: (tab: string) => set({ activeTab: tab }),

  setBoostMode: (enabled: boolean) => set({ boostMode: enabled }),
  setShowEndScreen: (showEndScreen: boolean) => set({ showEndScreen }), // Added setShowEndScreen action

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
      cooldownDurations: newState.cooldownDurations || {}, // Ensure cooldownDurations is initialized
      // Ensure loop-related states are initialized from loaded state
      loopProgress: newState.loopProgress !== undefined ? newState.loopProgress : 0,
      isGameLoopActive: newState.isGameLoopActive !== undefined ? newState.isGameLoopActive : false,
      isPaused: newState.isPaused !== undefined ? newState.isPaused : false, // Ensure isPaused is initialized
      showEndScreen: newState.showEndScreen !== undefined ? newState.showEndScreen : false, // Ensure showEndScreen is initialized
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

    // Store initial cooldown duration if it's a new cooldown
    if (result.stateUpdates.cooldowns && result.stateUpdates.cooldowns[actionId]) {
      const initialDuration = result.stateUpdates.cooldowns[actionId];
      set((prevState) => ({
        cooldownDurations: {
          ...prevState.cooldownDurations,
          [actionId]: initialDuration,
        },
      }));
    }


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
    set((state) => {
      const newState = {
        cooldowns: { ...state.cooldowns, [action]: duration },
        cooldownDurations: { ...state.cooldownDurations, [action]: duration }, // Also set initial duration
      };
      return newState;
    });
  },

  tickCooldowns: () => {
    set((state) => {
      const newCooldowns = { ...state.cooldowns };
      const newCooldownDurations = { ...state.cooldownDurations }; // Copy durations

      for (const key in newCooldowns) {
        if (newCooldowns[key] > 0) {
          newCooldowns[key] = Math.max(0, newCooldowns[key] - 0.2);
        }

        // If cooldown has reached 0, reset its duration as well
        if (newCooldowns[key] === 0 && newCooldownDurations[key]) {
          delete newCooldownDurations[key];
        }
      }
      return { cooldowns: newCooldowns, cooldownDurations: newCooldownDurations }; // Return both updated states
    });
  },

  restartGame: () => {
    const currentBoostMode = get().boostMode;

    const resetState = {
      ...defaultGameState,
      activeTab: "cave",
      cooldowns: {},
      cooldownDurations: {},
      log: [],
      devMode: import.meta.env.DEV,
      boostMode: currentBoostMode,
      effects: calculateTotalEffects(defaultGameState),
      bastion_stats: calculateBastionStats(defaultGameState),
      // Ensure loop state is reset
      loopProgress: 0,
      isGameLoopActive: false,
      isPaused: false, // Reset pause state
      showEndScreen: false, // Reset showEndScreen
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
    const { loadGame: loadFromIDB } = await import('@/game/save');
    const savedState = await loadFromIDB();
    const currentBoostMode = get().boostMode;

    if (savedState) {
      const loadedState = {
        ...savedState,
        activeTab: "cave",
        cooldowns: savedState.cooldowns || {},
        cooldownDurations: savedState.cooldownDurations || {},
        log: savedState.log || [],
        events: savedState.events || defaultGameState.events,
        devMode: import.meta.env.DEV,
        boostMode: savedState.boostMode,
        effects: calculateTotalEffects(savedState),
        bastion_stats: calculateBastionStats(savedState),
        // Ensure loop state is loaded correctly
        loopProgress: savedState.loopProgress !== undefined ? savedState.loopProgress : 0,
        isGameLoopActive: savedState.isGameLoopActive !== undefined ? savedState.isGameLoopActive : false,
        isPaused: savedState.isPaused !== undefined ? savedState.isPaused : false, // Ensure isPaused is loaded
        showEndScreen: savedState.showEndScreen !== undefined ? savedState.showEndScreen : false, // Ensure showEndScreen is loaded
      };

      set(loadedState);
    } else {
      const newGameState = {
        ...defaultGameState,
        activeTab: "cave",
        cooldowns: {},
        cooldownDurations: {},
        log: [],
        devMode: import.meta.env.DEV,
        boostMode: currentBoostMode, // Preserve boost mode flag
        effects: calculateTotalEffects(defaultGameState),
        bastion_stats: calculateBastionStats(defaultGameState),
      };

      set(newGameState);

      const initialLogEntry: LogEntry = {
        id: "initial-narrative",
        message: currentBoostMode
          ? "A dark cave. The air is cold and damp. You barely see the shapes around you. Someone left you a gift."
          : "A dark cave. The air is cold and damp. You barely see the shapes around you.",
        timestamp: Date.now(),
        type: "system",
      };
      get().addLogEntry(initialLogEntry);
    }

    StateManager.scheduleEffectsUpdate(get);
  },

  addLogEntry: (entry: LogEntry) => {
    if (entry.type === "event") {
      // Check mute state before playing sound
      if (!get().isMuted()) {
        audioManager.playSound("event", 0.02);
      }
    }

    set((state) => ({
      log: [...state.log, entry].slice(-10),
    }));
  },

  checkEvents: () => {
    const state = get();
    // If the game is paused, do not process events
    if (state.isPaused) return;

    // Don't check for new events if any dialog is already open
    const isAnyDialogOpen = state.eventDialog.isOpen || state.combatDialog.isOpen;
    if (isAnyDialogOpen) return;

    const { newLogEntries, stateChanges, triggeredEvents } =
      EventManager.checkEvents(state);

    if (newLogEntries.length > 0) {
      let combatData = null;
      const updatedChanges = { ...stateChanges };

      if (updatedChanges._combatData) {
        combatData = updatedChanges._combatData;
        delete updatedChanges._combatData;
      }

      set((prevState) => ({
        ...prevState,
        ...updatedChanges,
      }));

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

        // Check mute state before playing sound
        if (!get().isMuted()) {
          audioManager.playSound(
            hasMadnessEvent ? "eventMadness" : "event",
            0.02,
          );
        }
      }
    }
  },

  applyEventChoice: (choiceId: string, eventId: string) => {
    const state = get();
    // If the game is paused, do not apply event choices
    if (state.isPaused) return;

    const currentLogEntry = get().eventDialog.currentEvent;
    const changes = EventManager.applyEventChoice(
      state,
      choiceId,
      eventId,
      currentLogEntry || undefined,
    );

    let combatData = null;
    const updatedChanges = { ...changes };

    // Extract combat data if present
    if (updatedChanges._combatData) {
      combatData = updatedChanges._combatData;
      delete updatedChanges._combatData;
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
    set((state) => {
      const updates = assignVillagerToJob(state, job);
      if (Object.keys(updates).length > 0) {
        StateManager.schedulePopulationUpdate(get);
      }
      return updates;
    });
  },

  unassignVillager: (job: keyof GameState["villagers"]) => {
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
      // Check mute state before playing sound
      if (!get().isMuted()) {
        audioManager.playSound(isMadnessEvent ? "eventMadness" : "event", 0.02);
      }
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

  setAuthDialogOpen: (isOpen: boolean) => {
    set({ authDialogOpen: isOpen });
  },

  setShopDialogOpen: (isOpen: boolean) => {
    set({ shopDialogOpen: isOpen });
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

  updateLoopProgress: (progress: number) => {
    set((state) => ({
      loopProgress: progress,
    }));
  },

  setGameLoopActive: (isActive: boolean) => {
    set((state) => ({
      isGameLoopActive: isActive,
    }));
  },

  togglePause: () => {
    set((state) => {
      const newState = {
        isPaused: !state.isPaused,
        loopProgress: 0, // Always reset loop progress when toggling pause
      };
      return newState;
    });
  },

  toggleMute: () => {
    set((state) => {
      const newMutedState = !state.flags.isMuted;

      if (newMutedState) {
        // Stop all sounds when muting
        audioManager.pauseAllSounds();
      } else {
        // Resume sounds when unmuting
        audioManager.resumeSounds();
      }

      return {
        flags: {
          ...state.flags,
          isMuted: newMutedState,
        },
      };
    });
  },

  isMuted: () => {
    return get().flags.isMuted;
  },
}));