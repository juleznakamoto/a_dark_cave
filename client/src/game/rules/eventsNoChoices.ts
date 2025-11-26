
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

export const noChoiceEvents: Record<string, GameEvent> = {
  bloodDrainedVillagers: {
    id: "bloodDrainedVillagers",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 7,
    triggerType: "resource",
    timeProbability: (state: GameState) =>
      state.story.seen.bloodDrainedVillagersFirstTime ? 0.030 : 0.045,
    title: "Drained Bodies",
    message: (state: GameState) => {
      const isFirstTime = !state.story.seen.bloodDrainedVillagersFirstTime;

      if (isFirstTime) {
        return `One morning, 6 villagers are found dead in their beds, pale and drained of all blood. Small punctures cover their skin. Some villagers suspect this could be connected to the damaged tower in the forest where hunters heard strange sounds.`;
      } else {
        return `Again, 8 more villagers are discovered dead at dawn, their bodies drained of blood, covered in the same mysterious marks. The demands that something be done about what dwells in the damaged tower grow louder.`;
      }
    },
    triggered: false,
    priority: 4,
    repeatable: true,
    effect: (state: GameState) => {
      const isFirstTime = !state.story.seen.bloodDrainedVillagersFirstTime;
      const deaths = isFirstTime ? 6 : 8;
      const result = killVillagers(state, deaths);
      
      return {
        ...result,
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            bloodDrainedVillagersFirstTime: true,
            damagedTowerUnlocked: true,
          },
        },
      };
    },
  },

  villageBecomesCity: {
    id: "villageBecomesCity",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 5 && !state.flags.hasCity,
    triggerType: "time",
    message: "The village has grown into a city. What began as a small settlement now stands as a thriving center of stone and smoke.",
    triggered: false,
    priority: 10,
    timeProbability: 0.01,
    repeatable: false,
    effect: (state: GameState) => ({
      flags: {
        ...state.flags,
        hasCity: true,
      },
      story: {
        ...state.story,
        seen: { ...state.story.seen, villageBecomesCity: true },
      },
    }),
  },

  bastionBecomesFortress: {
    id: "bastionBecomesFortress",
    condition: (state: GameState) =>
      state.buildings.fortifiedMoat >= 1 &&
      state.buildings.palisades >= 3 &&
      state.buildings.watchtower >= 3 &&
      !state.flags.hasFortress,
    triggerType: "time",
    message: "Your bastion has grown into a mighty fortress of stone and steel.",
    triggered: false,
    priority: 10,
    timeProbability: 0.01,
    repeatable: false,
    effect: (state: GameState) => ({
      flags: {
        ...state.flags,
        hasFortress: true,
      },
      story: {
        ...state.story,
        seen: { ...state.story.seen, bastionBecomesFortress: true },
      },
    }),
  },

  findElderScroll: {
    id: "findElderScroll",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 6 &&
      !state.relics.elder_scroll,
    triggerType: "time",
    timeProbability: 45,
    message:
      "During the night as you pass a narrow path, something moves at the edge of your vision, like a shadow fleeing the firelight. You follow it, and there, upon the cold stones, lies an ancient scroll.",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    repeatable: false,
    effect: (state: GameState) => ({
      relics: {
        ...state.relics,
        elder_scroll: true,
      },
      events: {
        ...state.events,
        elder_scroll_found: true,
      },
    }),
  },

  blindDruidBlessing: {
    id: "blindDruidBlessing",
    condition: (state: GameState) =>
      state.buildings.shrine >= 1 &&
      !state.blessings.forests_grace &&
      !state.story.seen.blindDruidBlessing,
    triggerType: "resource",
    timeProbability: 0.5,
    title: "The Blind Druid",
    message:
      "A blind druid emerges from the forest. He approaches the shrine and nods approvingly. 'The gods of the forest are pleased with your devotion, they grant you their blessing'.",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    repeatable: false,
    effect: (state: GameState) => ({
      blessings: {
        ...state.blessings,
        forests_grace: true,
      },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          blindDruidBlessing: true,
        },
      },
    }),
  },
};
