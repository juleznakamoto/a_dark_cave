import { GameEvent, EventChoice } from "./events";
import { GameState } from "@shared/schema";

const COLLECTOR_ITEMS = [
  "bloodstained_belt",
  "tarnished_amulet",
  "muttering_amulet",
  "cracked_crown",
  "ring_of_drowned",
  "red_mask",
  "wooden_figure",
  "shadow_flute",
] as const;

export const wanderingCollectorEvents: Record<string, GameEvent> = {
  wandering_collector: {
    id: "wandering_collector",
    condition: (state: GameState) => {
      const ownedItems = COLLECTOR_ITEMS.filter(
        (itemId) => {
          if (state.clothing && (state.clothing as any)[itemId]) return true;
          if (state.relics && (state.relics as any)[itemId]) return true;
          return false;
        }
      );
      return ownedItems.length >= 0;
    },
    title: "The Wandering Collector",
    message: "A mysterious figure wrapped in tattered robes approaches. They seem interested in the curiosities you've found.",
    timeProbability: 0.05,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000, // 3 minutes
    choices: (state: GameState): EventChoice[] => {
      const ownedItems = COLLECTOR_ITEMS.filter(
        (itemId) => {
          if (state.clothing && (state.clothing as any)[itemId]) return true;
          if (state.relics && (state.relics as any)[itemId]) return true;
          return false;
        }
      );

      // Randomly select up to 4 items from owned items
      const shuffled = [...ownedItems].sort(() => 0.5 - Math.random());
      const selectedItems = shuffled.slice(0, 4);

      const choices: EventChoice[] = selectedItems.map((itemId) => ({
        id: `sell_${itemId}`,
        label: `Sell ${itemId.replace(/_/g, " ")} (100 Gold)`,
        effect: (innerState: GameState) => {
          const newState: Partial<GameState> = {
            resources: {
              ...innerState.resources,
              gold: (innerState.resources.gold || 0) + 100,
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
            _logMessage: "The collector takes the item with a bony hand. 'I found out that there has not always been magic in this world, but it only appeared after the mysterious explosion,' they whisper before vanishing.",
            timedEventTab: { isActive: false }
          } as any;
        },
      }));

      // Fifth option: Sell nothing
      choices.push({
        id: "sell_nothing",
        label: "Keep your items",
        effect: () => ({
          _logMessage: "The collector sighs and turns away. 'I found out that there has not always been magic in this world, but it only appeared after the mysterious explosion,' they murmur as they fade into the shadows.",
          timedEventTab: { isActive: false }
        } as any),
      });

      return choices;
    },
  },
};
