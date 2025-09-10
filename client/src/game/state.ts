import { create } from 'zustand';
import { GameState } from '@shared/schema';
import { gameActions } from '@/game/rules';

interface GameStore extends GameState {
  // Actions
  lightFire: () => void;
  gatherWood: () => void;
  setActiveTab: (tab: string) => void;
  updateResource: (resource: keyof GameState['resources'], amount: number) => void;
  setFlag: (flag: keyof GameState['flags'], value: boolean) => void;
  initialize: (state: GameState) => void;
  
  // UI state
  activeTab: string;
  lastSaved: string;
  isGameLoopActive: boolean;
  
  // Cooldown management
  cooldowns: Record<string, number>;
  setCooldown: (action: string, duration: number) => void;
  tickCooldowns: () => void;
}

const defaultGameState: GameState = {
  resources: { wood: 0, food: 0 },
  flags: { fireLit: false, villageUnlocked: false, worldDiscovered: false },
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
      cooldowns: { ...state.cooldowns, gatherWood: cooldown }
    }));
  },

  setActiveTab: (tab: string) => {
    set({ activeTab: tab });
  },

  updateResource: (resource: keyof GameState['resources'], amount: number) => {
    set((state) => ({
      resources: { ...state.resources, [resource]: Math.max(0, state.resources[resource] + amount) }
    }));
  },

  setFlag: (flag: keyof GameState['flags'], value: boolean) => {
    set((state) => ({
      flags: { ...state.flags, [flag]: value }
    }));
  },

  initialize: (newState: GameState) => {
    set({ ...newState });
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
}));
