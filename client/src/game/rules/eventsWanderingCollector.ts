import { GameEvent, EventChoice } from "./events";
import { GameState } from "@shared/schema";
import { capitalizeWords } from "@/lib/utils";

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
      const visitCount = state.story?.seen?.collectorVisitCount || 0;
      if (visitCount >= 3) return false;

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
    message: (state: GameState) => {
      const visitCount = state.story?.seen?.collectorVisitCount || 0;
      const messages = [
        "A mysterious figure wrapped in tattered robes approaches. They seem interested in the curiosities you've found.",
        "The hooded figure returns, their steps silent on the stone. 'You have more... interesting things,' they whisper.",
        "The collector appears one last time, their eyes gleaming from within the hood. 'Our time grows short. Show me what remains.'"
      ];
      return messages[Math.min(visitCount, 2)];
    },
    timeProbability: 0.05,
    repeatable: true,
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
        label: `Sell ${capitalizeWords(itemId.replace(/_/g, " "))} (100 Gold)`,
        effect: (innerState: GameState) => {
          const visitCount = (innerState.story?.seen?.collectorVisitCount || 0) + 1;
          const newState: Partial<GameState> = {
            resources: {
              ...innerState.resources,
              gold: (innerState.resources.gold || 0) + 100,
            },
            story: {
              ...innerState.story,
              seen: {
                ...innerState.story.seen,
                collectorVisitCount: visitCount
              }
            }
          };

          // Remove from appropriate category
          if (innerState.clothing && (innerState.clothing as any)[itemId]) {
            newState.clothing = { ...innerState.clothing, [itemId]: false } as any;
          } else if (innerState.relics && (innerState.relics as any)[itemId]) {
            newState.relics = { ...innerState.relics, [itemId]: false } as any;
          }

          const whispers = [
            "The collector takes the item with a bony hand. 'I found out that there has not always been magic in this world, but it only appeared after the mysterious explosion,' they whisper before vanishing.",
            "They examine the item closely. 'The light... it used to be different. Clearer. Before the shadows learned to hunger,' they murmur.",
            "A thin finger traces the artifact. 'Everything returns to the dark eventually. Even the memories of the before-time,' they sigh and fade away."
          ];

          return {
            ...newState,
            _logMessage: whispers[Math.min(visitCount - 1, 2)],
            timedEventTab: { isActive: false }
          } as any;
        },
      }));

      // Fifth option: Keep items
      choices.push({
        id: "keep_items",
        label: "Keep your items",
        effect: (innerState: GameState) => {
          const visitCount = (innerState.story?.seen?.collectorVisitCount || 0) + 1;
          const whispers = [
            "The collector sighs and turns away. 'I found out that there has not always been magic in this world, but it only appeared after the mysterious explosion,' they murmur as they fade into the shadows.",
            "A low hum comes from the hood. 'Some treasures are merely anchors for the past,' they say, disappearing once more.",
            "They nod slowly. 'Hold tight to what you can. The void is cold and very, very long,' they whisper for the final time."
          ];
          
          return {
            story: {
              ...innerState.story,
              seen: {
                ...innerState.story.seen,
                collectorVisitCount: visitCount
              }
            },
            _logMessage: whispers[Math.min(visitCount - 1, 2)],
            timedEventTab: { isActive: false }
          } as any;
        },
      });

      return choices;
    },
  },
};
