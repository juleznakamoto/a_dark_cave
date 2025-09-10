import { create } from 'zustand';
import { GameState } from '@shared/schema';

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

  lightFire: () => {
    set((state) => ({
      flags: { ...state.flags, fireLit: true },
      story: { ...state.story, seen: { ...state.story.seen, fireLit: true } }
    }));
  },

  gatherWood: () => {
    const amount = Math.floor(Math.random() * 3) + 1; // 1-3 wood per gather
    set((state) => ({
      resources: { ...state.resources, wood: state.resources.wood + amount }
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
}));
