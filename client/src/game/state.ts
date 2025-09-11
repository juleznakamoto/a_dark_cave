import { create } from 'zustand';
import { GameState } from '@shared/schema';
import { gameActions, shouldShowAction, canExecuteAction, applyActionEffects } from '@/game/rules';
import { LogEntry, EventManager } from '@/game/events';

interface GameStore extends GameState {
  // Actions
  lightFire: () => void;
  gatherWood: () => void;
  executeAction: (actionId: string) => void;
  setActiveTab: (tab: string) => void;
  updateResource: (resource: keyof GameState['resources'], amount: number) => void;
  setFlag: (flag: keyof GameState['flags'], value: boolean) => void;
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
  assignVillager: (job: 'gatherers' | 'hunters') => void;
  unassignVillager: (job: 'gatherers' | 'hunters') => void;
}

const defaultGameState: GameState = {
  resources: {
    wood: 0,
    meat: 0,
    torch: 0,
    stone: 0,
  },
  flags: {
    fireLit: false,
    villageUnlocked: false,
    worldDiscovered: false,
    torchBuilt: false,
    caveExplored: false,
  },
  tools: {
    axe: false,
    spear: false,
  },
  buildings: {
    huts: 0,
    traps: 0,
    lodges: 0,
    workshops: 0,
  },
  villagers: {
    free: 0,
    hunters: 0,
    gatherers: 0,
  },
  world: {
    discovered: false,
    position: { x: 0, y: 0 },
  },
  story: {
    seen: {},
  },
  events: {
    available: [],
    active: [],
    log: [],
  },
  current_population: 0,
  total_population: 0,
  version: 1,
};




export const useGameStore = create<GameStore>((set, get) => ({
  ...defaultGameState,
  activeTab: 'cave',
  lastSaved: 'Never',
  isGameLoopActive: false,
  devMode: true,
  cooldowns: {},
  log: [],
  events: {},
  current_population: 0,
  total_population: 0,

  lightFire: () => {
    const state = get();
    if ((state.cooldowns['lightFire'] || 0) > 0 && !state.devMode) return;
    if (state.flags.fireLit) return; // Don't light fire if already lit

    const cooldown = gameActions.lightFire.cooldown;

    // Add fire lit message to log
    const fireLogEntry: LogEntry = {
      id: `fire-lit-${Date.now()}`,
      message: 'The fire crackles softly, casting dancing shadows on the cave walls. The warmth is comforting.',
      timestamp: Date.now(),
      type: 'system',
    };

    set((state) => ({
      flags: { ...state.flags, fireLit: true },
      story: { ...state.story, seen: { ...state.story.seen, fireLit: true } },
      cooldowns: { ...state.cooldowns, lightFire: state.devMode ? 0 : cooldown },
      log: [...state.log, fireLogEntry].slice(-8)
    }));
  },

  gatherWood: () => {
    const state = get();
    if ((state.cooldowns['gatherWood'] || 0) > 0 && !state.devMode) return;

    get().executeAction('gatherWood');
  },

  setActiveTab: (tab: string) => {
    set({ activeTab: tab });
  },

  updateResource: (resource: keyof GameState['resources'], amount: number) => {
    set((state) => {
      const newAmount = Math.max(0, state.resources[resource] + amount);
      const updates: any = {
        resources: { ...state.resources, [resource]: newAmount }
      };

      // Track when resources are first seen
      if (newAmount > 0 && !state.story.seen[`has${resource.charAt(0).toUpperCase() + resource.slice(1)}`]) {
        updates.story = {
          ...state.story,
          seen: {
            ...state.story.seen,
            [`has${resource.charAt(0).toUpperCase() + resource.slice(1)}`]: true
          }
        };
      }

      return updates;
    });
  },

  setFlag: (flag: keyof GameState['flags'], value: boolean) => {
    set((state) => ({
      flags: { ...state.flags, [flag]: value }
    }));
  },

  initialize: (newState: GameState) => {
    set({ ...newState });
  },

  executeAction: (actionId: string) => {
    const state = get();
    const action = gameActions[actionId];

    if (!action || ((state.cooldowns[actionId] || 0) > 0 && !state.devMode)) return;

    // Check requirements before executing using the centralized logic
    if (!shouldShowAction(actionId, state) || !canExecuteAction(actionId, state)) return;

    // Mark action as seen
    const seenKey = `action${actionId.charAt(0).toUpperCase() + actionId.slice(1)}`;

    // Apply action effects and mark as seen
    const updates: any = {
      cooldowns: { ...state.cooldowns, [actionId]: state.devMode ? 0 : action.cooldown },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          [seenKey]: true
        }
      }
    };

    // Apply specific action effects
    if (actionId === 'lightFire') {
      updates.flags = { ...state.flags, fireLit: true };
      updates.story.seen.fireLit = true;

      // Add fire lit message to log
      const fireLogEntry: LogEntry = {
        id: `fire-lit-${Date.now()}`,
        message: 'The fire crackles softly, casting dancing shadows on the cave walls. The warmth is comforting.',
        timestamp: Date.now(),
        type: 'system',
      };
      updates.log = [...state.log, fireLogEntry].slice(-8);
    } else if (actionId === 'gatherWood') {
      const effectUpdates = applyActionEffects(actionId, state);
      Object.assign(updates, effectUpdates);
    } else if (actionId === 'buildTorch') {
      updates.resources = { ...state.resources, wood: state.resources.wood - 10, torch: state.resources.torch + 1 };
      updates.flags = { ...state.flags, torchBuilt: true };
      updates.story = {
        ...state.story,
        seen: {
          ...state.story.seen,
          actionBuildTorch: true
        }
      };

      // Add rumbling sound after first torch (only if not seen before)
      if (!state.story.seen.rumbleSound) {
        const rumbleLogEntry: LogEntry = {
          id: `rumble-sound-${Date.now()}`,
          message: 'A low, rumbling sound echoes from deeper in the cave.',
          timestamp: Date.now(),
          type: 'system',
        };

        updates.log = [...state.log, rumbleLogEntry].slice(-8);
        updates.story.seen.rumbleSound = true;
      }
    } else if (actionId === 'buildHut') {
      const level = state.buildings.huts + 1;
      const actionEffects = gameActions.buildHut.effects[level];
      const newResources = { ...state.resources };

      // Apply effects from the action definition
      for (const [path, effect] of Object.entries(actionEffects)) {
        if (path.startsWith('resources.')) {
          const resource = path.split('.')[1] as keyof typeof newResources;
          newResources[resource] += effect;
        }
      }

      updates.resources = newResources;
      updates.buildings = {
        ...state.buildings,
        huts: state.buildings.huts + 1
      };
      updates.story = {
        ...state.story,
        seen: {
          ...state.story.seen,
          actionBuildHut: true
        }
      };

      // After building the first hut, trigger stranger event
      if (state.buildings.huts === 0) {
        setTimeout(() => {
          const strangerLogEntry: LogEntry = {
            id: `stranger-approaches-${Date.now()}`,
            message: 'A stranger approaches through the woods.',
            timestamp: Date.now(),
            type: 'system',
          };

          get().addLogEntry(strangerLogEntry);
          setTimeout(() => {
            set((state) => {
              const currentPopulation = state.villagers.free + state.villagers.gatherers + state.villagers.hunters;
              const maxPopulation = state.buildings.huts * 2;

              if (currentPopulation < maxPopulation) {
                const newState = {
                  villagers: {
                    ...state.villagers,
                    free: state.villagers.free + 1
                  },
                  story: {
                    ...state.story,
                    seen: {
                      ...state.story.seen,
                      hasVillagers: true
                    }
                  }
                };
                // Update population after changing villagers
                setTimeout(() => get().updatePopulation(), 0);
                return newState;
              }
              return state;
            });
          }, 1000);
        }, 2000);
      }
    } else if (actionId === 'buildLodge') {
      const level = state.buildings.lodges + 1;
      const actionEffects = gameActions.buildLodge.effects[level];
      const newResources = { ...state.resources };

      // Apply effects from the action definition
      for (const [path, effect] of Object.entries(actionEffects)) {
        if (path.startsWith('resources.')) {
          const resource = path.split('.')[1] as keyof typeof newResources;
          newResources[resource] += effect;
        }
      }

      updates.resources = newResources;
      updates.buildings = {
        ...state.buildings,
        lodges: state.buildings.lodges + 1
      };
      updates.story = {
        ...state.story,
        seen: {
          ...state.story.seen,
          actionBuildLodge: true
        }
      };
    } else if (actionId === 'buildWorkshop') {
      const level = state.buildings.workshops + 1;
      const actionEffects = gameActions.buildWorkshop.effects[level];
      const newResources = { ...state.resources };

      // Apply effects from the action definition
      for (const [path, effect] of Object.entries(actionEffects)) {
        if (path.startsWith('resources.')) {
          const resource = path.split('.')[1] as keyof typeof newResources;
          newResources[resource] += effect;
        }
      }

      updates.resources = newResources;
      updates.buildings = {
        ...state.buildings,
        workshops: state.buildings.workshops + 1
      };
      updates.story = {
        ...state.story,
        seen: {
          ...state.story.seen,
          actionBuildWorkshop: true
        }
      };
    }
     else if (actionId === 'exploreCave') {
      const stonesFound = Math.floor(Math.random() * 4) + 1; // 1-4 stones
      updates.resources = {
        ...state.resources,
        torch: state.resources.torch - 5,
        stone: state.resources.stone + stonesFound
      };
      updates.flags = { ...state.flags, caveExplored: true };
      updates.story = {
        ...state.story,
        seen: {
          ...state.story.seen,
          hasStone: true
        }
      };


    } else if (actionId === 'craftAxe') {
      const effectUpdates = applyActionEffects(actionId, state);
      Object.assign(updates, effectUpdates);

      // Add log entry for village unlocked
      const villageLogEntry: LogEntry = {
        id: `village-unlocked-${Date.now()}`,
        message: 'Outside the cave, a small clearing opens up. This could be the foundation of something greater.',
        timestamp: Date.now(),
        type: 'system',
      };

      updates.log = [...state.log, villageLogEntry].slice(-8);
    }

    set((prevState) => ({
      ...prevState,
      ...updates
    }));
  },

  setCooldown: (action: string, duration: number) => {
    set((state) => ({
      cooldowns: { ...state.cooldowns, [action]: duration }
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
      activeTab: 'cave',
      lastSaved: 'Never',
      cooldowns: {},
      log: [],
      events: {},
      devMode: true,
    });

    // Then add the initial cave description
    const initialLogEntry: LogEntry = {
      id: 'initial-narrative',
      message: 'A dark cave. The air is cold and stale. You can barely make out the shapes around you.',
      timestamp: Date.now(),
      type: 'system',
    };

    get().addLogEntry(initialLogEntry);
  },

  loadGame: async () => {
    // Placeholder for actual game loading logic
    const loadGame = async () => {
      // In a real scenario, this would fetch saved game data from local storage or an API
      // For demonstration purposes, we'll simulate loading a saved game or starting a new one
      const savedState = localStorage.getItem('gameState');
      return savedState ? JSON.parse(savedState) : null;
    };

    const savedState = await loadGame();

    if (savedState) {
      set({
        ...savedState,
        activeTab: 'cave',
        lastSaved: 'Loaded',
        cooldowns: {},
        events: get().events,
        devMode: true, // Ensure devMode is always true
      });
    } else {
      // For new games, first set the initial state
      set({
        ...defaultGameState,
        activeTab: 'cave',
        lastSaved: 'Never',
        cooldowns: {},
        log: [],
        events: {},
        devMode: true,
      });

      // Then immediately add the initial cave description
      const initialLogEntry: LogEntry = {
        id: 'initial-narrative',
        message: 'A dark cave. The air is cold and stale. You can barely make out the shapes around you.',
        timestamp: Date.now(),
        type: 'system',
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
          ...newLogEntries.reduce((acc, entry) => {
            const eventId = entry.id.split('-')[0];
            acc[eventId] = true;
            return acc;
          }, {} as Record<string, boolean>),
        },
      }));

      // Update population after applying changes
      setTimeout(() => get().updatePopulation(), 0);
    }
  },

  applyEventChoice: (choiceId: string, eventId: string) => {
    const state = get();
    const changes = EventManager.applyEventChoice(state, choiceId, eventId);

    if (Object.keys(changes).length > 0) {
      set((prevState) => ({
        ...prevState,
        ...changes,
      }));
    }
  },

  toggleDevMode: () => {
    // Dev mode is always enabled - no-op
  },

  assignVillager: (job: 'gatherers' | 'hunters') => {
    set((state) => {
      if (state.villagers.free > 0) {
        const updates: any = {
          villagers: {
            ...state.villagers,
            free: state.villagers.free - 1,
            [job]: state.villagers[job] + 1
          }
        };

        // Track when population types are first assigned
        if (job === 'hunters' && state.villagers.hunters === 0) {
          updates.story = {
            ...state.story,
            seen: {
              ...state.story.seen,
              hasHunters: true
            }
          };
        } else if (job === 'gatherers' && state.villagers.gatherers === 0) {
          updates.story = {
            ...state.story,
            seen: {
              ...state.story.seen,
              hasGatherers: true
            }
          };
        }

        // Update population after changing villagers
        setTimeout(() => get().updatePopulation(), 0);
        return updates;
      }
      return state;
    });
  },

  unassignVillager: (job: 'gatherers' | 'hunters') => {
    set((state) => {
      if (state.villagers[job] > 0) {
        const newState = {
          villagers: {
            ...state.villagers,
            free: state.villagers.free + 1,
            [job]: state.villagers[job] - 1
          }
        };
        // Update population after changing villagers
        setTimeout(() => get().updatePopulation(), 0);
        return newState;
      }
      return state;
    });
  },

  getMaxPopulation: () => {
    const state = get();
    return state.buildings.huts * 2; // Each hut provides +2 max population
  },

  updatePopulation: () => {
    set((state) => {
      const current = state.villagers.free + state.villagers.gatherers + state.villagers.hunters;
      const total = state.buildings.huts * 2;
      return {
        ...state,
        current_population: current,
        total_population: total
      };
    });
  },
}));