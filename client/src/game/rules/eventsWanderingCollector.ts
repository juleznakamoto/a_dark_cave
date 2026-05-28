import { GameEvent, EventChoice } from "./events";
import { GameState } from "@shared/schema";
import { getClothingOrRelicEffectName } from "@/i18n/resolveGameText";

const COLLECTOR_ITEMS = [
  "bloodstained_belt",
  "tarnished_amulet",
  "muttering_amulet",
  "cracked_crown",
  "ring_of_drowned",
  "red_mask",
  "bone_necklace",
  "wooden_figure",
  "bone_dice",
  "blackened_mirror",
  "shadow_flute",
  "hollow_king_scepter",
] as const;

const COLLECTOR_REWARD = 100

export const wanderingCollectorEvents: Record<string, GameEvent> = {
  wandering_collector: {
    id: "wandering_collector",
    i18nVars: { reward: COLLECTOR_REWARD },
    condition: (state: GameState) => {
      const ownedItems = COLLECTOR_ITEMS.filter((itemId) => {
        if (state.clothing && (state.clothing as any)[itemId]) return true;
        if (state.relics && (state.relics as any)[itemId]) return true;
        return false;
      });
      if (ownedItems.length === 0) return false;

      const visitCountValue = state.story?.seen?.collectorVisitCount;
      const visitCount = typeof visitCountValue === "number" ? visitCountValue : 0;
      if (visitCount >= 3) return false;
      if (visitCount == 0) return state.buildings.woodenHut >= 6;
      if (visitCount == 1) return state.buildings.woodenHut >= 10;
      if (visitCount == 2) return state.buildings.stoneHut >= 5;

      return ownedItems.length >= 3;
    },
    message: (state: GameState) => {
      const visitCountValue = state.story?.seen?.collectorVisitCount;
      const visitCount = typeof visitCountValue === "number" ? visitCountValue : 0;
      return "visit" + Math.min(visitCount, 2);
    },
    timeProbability: 15,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000, // 3 minutes
    choices: (state: GameState): EventChoice[] => {
      // Filter for items the player actually owns
      const ownedItems = COLLECTOR_ITEMS.filter((itemId) => {
        if (state.clothing && (state.clothing as any)[itemId]) return true;
        if (state.relics && (state.relics as any)[itemId]) return true;
        return false;
      });

      // Deterministic selection based on collectorVisitCount
      const visitCountValue = state.story?.seen?.collectorVisitCount;
      const visitCount = typeof visitCountValue === "number" ? visitCountValue : 0;

      // We use a simple seed-based shuffle or just sort by a stable property
      // To keep it simple and deterministic for the user:
      // Sort alphabetically then pick 4 based on visitCount
      const sortedItems = [...ownedItems].sort();

      // Use visitCount to shift the selection if there are more than 4
      const startIndex = (visitCount * 2) % Math.max(1, sortedItems.length);
      const selectedItems: string[] = [];
      for (let i = 0; i < 4 && i < sortedItems.length; i++) {
        selectedItems.push(sortedItems[(startIndex + i) % sortedItems.length]);
      }

      const choices: EventChoice[] = selectedItems.map((itemId) => ({
        id: `sell_${itemId}`,
        label: getClothingOrRelicEffectName(itemId),
        effect: (innerState: GameState) => {
          const vCountValue = innerState.story?.seen?.collectorVisitCount;
          const vCount = typeof vCountValue === "number" ? vCountValue : 0;
          const newVisitCount = vCount + 1;
          const newState: Partial<GameState> = {
            resources: {
              ...innerState.resources,
              gold: (innerState.resources.gold || 0) + COLLECTOR_REWARD,
            },
            story: {
              ...innerState.story,
              seen: {
                ...innerState.story.seen,
                collectorVisitCount: newVisitCount,
              },
            },
          };

          // Remove from appropriate category
          if (innerState.clothing && (innerState.clothing as any)[itemId]) {
            newState.clothing = { ...innerState.clothing, [itemId]: false } as any;
          } else if (innerState.relics && (innerState.relics as any)[itemId]) {
            newState.relics = { ...innerState.relics, [itemId]: false } as any;
          }

          return {
            ...newState,
            _logMessageKey: `whisper${Math.min(newVisitCount - 1, 2)}`,
            timedEventTab: { isActive: false },
          } as any;
        },
      }));

      // Fifth option: Keep items
      choices.push({
        id: "sell_nothing",
        effect: (innerState: GameState) => {
          const vCountValue = innerState.story?.seen?.collectorVisitCount;
          const vCount = typeof vCountValue === "number" ? vCountValue : 0;
          const newVisitCount = vCount + 1;
          return {
            story: {
              ...innerState.story,
              seen: {
                ...innerState.story.seen,
                collectorVisitCount: newVisitCount,
              },
            },
            _logMessageKey: `whisper${Math.min(newVisitCount - 1, 2)}`,
            timedEventTab: { isActive: false },
          } as any;
        },
      });

      return choices;
    },
  },
};
