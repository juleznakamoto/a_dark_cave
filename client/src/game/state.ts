import { create } from 'zustand';
import { GameState } from '@shared/schema';
import { gameActions } from '@/game/rules';
import { LogEntry, EventManager } from '@/game/events';

interface GameStore extends GameState {
  // Actions
  lightFire: () => void;
  gatherWood: () => void;
  setActiveTab: (tab: string) => void;
  updateResource: (resource: keyof GameState['resources'], amount: number) => void;
  setFlag: (flag: keyof GameState['flags'], value: boolean) => void;
  initialize: (state: GameState) => void;
  restartGame: () => void;
  
  // UI state
  activeTab: string;
  lastSaved: string;
  isGameLoopActive: boolean;
  
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
}

const defaultGameState: GameState = {
  resources: { wood: 0, food: 0, torch: 0 },
  flags: { fireLit: false, villageUnlocked: false, worldDiscovered: false, torchBuilt: false },
  tools: { axe: false, spear: false },
  buildings: { huts: 0, traps: 0 },
  villagers: { free: 0, hunters: 0 },
  world: { discovered: false, position: { x: 0, y: 0 } },
  story: { seen: {} },
  version: 1,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...defaultGameState,
  activeTab: 'cave',
  lastSaved: 'Never',
  isGameLoopActive: false,
  cooldowns: {},
  log: [],
  events: {},

  lightFire: () => {
    const state = get();
    if ((state.cooldowns['lightFire'] || 0) > 0) return;
    
    const cooldown = gameActions.lightFire?.cooldown || 1;
    set((state) => ({
      flags: { ...state.flags, fireLit: true },
      story: { ...state.story, seen: { ...state.story.seen, fireLit: true } },
      cooldowns: { ...state.cooldowns, lightFire: cooldown }
    }));
  },

  gatherWood: () => {
    const state = get();
    if ((state.cooldowns['gatherWood'] || 0) > 0) return;
    
    const amount = Math.floor(Math.random() * 3) + 1; // 1-3 wood per gather
    const cooldown = gameActions.gatherWood?.cooldown || 3;
    set((state) => ({
      resources: { ...state.resources, wood: state.resources.wood + amount },
      story: { ...state.story, seen: { ...state.story.seen, hasWood: true } },
      cooldowns: { ...state.cooldowns, gatherWood: cooldown }
    }));
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
    
    if (!action || (state.cooldowns[actionId] || 0) > 0) return;
    
    // Mark action as seen
    const seenKey = `action${actionId.charAt(0).toUpperCase() + actionId.slice(1)}`;
    
    // Apply action effects and mark as seen
    const updates: any = {
      cooldowns: { ...state.cooldowns, [actionId]: action.cooldown || 1 },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          [seenKey]: true
        }
      }
    };
    
    // Apply specific action effects
    if (actionId === 'buildTorch') {
      updates.resources = { ...state.resources, wood: state.resources.wood - 10, torch: state.resources.torch + 1 };
      updates.flags = { ...state.flags, torchBuilt: true };
    } else if (actionId === 'buildHut') {
      updates.resources = { ...state.resources, wood: state.resources.wood - 50 };
      updates.buildings = { ...state.buildings, huts: state.buildings.huts + 1 };
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
    set({
      ...defaultGameState,
      activeTab: 'cave',
      lastSaved: 'Never',
      cooldowns: {},
      log: [],
      events: {},
    });
  },

  addLogEntry: (entry: LogEntry) => {
    set((state) => ({
      log: [...state.log, entry].slice(-50), // Keep only last 50 entries
    }));
  },

  checkEvents: () => {
    const state = get();
    const newLogEntries = EventManager.checkEvents(state);
    
    if (newLogEntries.length > 0) {
      set((prevState) => ({
        log: [...prevState.log, ...newLogEntries].slice(-50),
        events: {
          ...prevState.events,
          ...newLogEntries.reduce((acc, entry) => {
            const eventId = entry.id.split('-')[0];
            acc[eventId] = true;
            return acc;
          }, {} as Record<string, boolean>),
        },
      }));
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
}));
