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
  "bone_necklace",
  "wooden_figure",
  "bone_dice",
  "blackened_mirror",
  "shadow_flute",
  "hollow_king_scepter",
] as const;

export const wanderingCollectorEvents: Record<string, GameEvent> = {
  wandering_collector: {
    id: "wandering_collector",
    condition: (state: GameState) => {
      const visitCount = state.story?.seen?.collectorVisitCount || 0;
      if (visitCount >= 999999999) return false;
      // if (visitCount == 0) return state.buildings.woodenHut >= 6;
      // if (visitCount == 1) return state.buildings.woodenHut >= 10;
      // if (visitCount == 2) return state.buildings.stoneHut >= 5;

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
        "A figure wrapped in tattered robes approaches. He seems intrigued by what you’ve gathered. 'I sense value among your possessions,' he murmurs. 'Allow me to take one, in exchange for 100 gold.'",
        "The robed figure returns, his steps soundless on the stone. 'More artifacts, more secrets', he whispers. 'Let me claim one again, and your purse will be 100 gold heavier.'",
        "The collector appears again, eyes glowing within the hood. 'Our dealings near their end, he says softly. 'Sell me one more, and 100 gold shall be yours.'"
      ];
      return messages[Math.min(visitCount, 2)];
    },
    timeProbability: 0.05,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 1 * 60 * 1000, // 3 minutes
    choices: (state: GameState): EventChoice[] => {
      // Filter for items the player actually owns
      const ownedItems = COLLECTOR_ITEMS.filter(
        (itemId) => {
          if (state.clothing && (state.clothing as any)[itemId]) return true;
          if (state.relics && (state.relics as any)[itemId]) return true;
          return false;
        }
      );

      // Deterministic selection based on collectorVisitCount
      const visitCount = state.story?.seen?.collectorVisitCount || 0;
      
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
        label: `Sell ${capitalizeWords(itemId)}`,
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
            "The collector takes the item with a bony hand. 'On my travels I found many items of the ancient civilization. They were very advanced,' he whispers before vanishing.",
            "He examines the item closely before taking it. 'The great explosion destryoed most of the artifactos of the ancient cilivization. It is hard to find any.' he murmurs.",
            "A thin finger traces the artifact. 'I learned a lot about the ancient civilization on my travels. Before the great explosion there was no magic in this world. It came with the explsoion.' he whispers while leaving."
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
        id: "sell_nothing",
        label: "Sell nothing",
        effect: (innerState: GameState) => {
          const visitCount = (innerState.story?.seen?.collectorVisitCount || 0) + 1;
          const whispers = [
            "The collector sighs and turns away. 'On my travels I found many items of the ancient civilization. They were very advanced,' he whispers before vanishing.",
            "A low hum comes from the hood. 'The great explosion destryoed most of the artifactos of the ancient cilivization. It is hard to find any.' he murmurs.",
            "A slight sigh comes from the collector. 'I learned a lot about the ancient civilization on my travels. Before the great explosion there was no magic in this world. It came with the explsoion.' he whispers while leaving."
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
