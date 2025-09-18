
import { GameEvent } from "./events";

export const baseEvents: Record<string, GameEvent> = {
  strangerApproaches: {
    id: "strangerApproaches",
    condition: (state) => state.current_population < state.total_population,
    triggerType: "resource",
    timeProbability: (state) => {
      let baseProbability = 1;
      baseProbability *= Math.pow(0.9, state.buildings.woodenHut);

      return baseProbability;
    },
    message: [
      "A stranger approaches through the woods and joins your village.",
      "A traveler arrives and decides to stay.",
      "A wanderer appears from the woods and becomes part of your community.",
      "Someone approaches the village and settles in.",
      "A stranger joins your community, bringing skills and hope.",
      "A newcomer arrives and makes themselves at home.",
    ][Math.floor(Math.random() * 6)],
    triggered: false,
    priority: 1,
    effect: (state) => ({
      villagers: {
        ...state.villagers,
        free: state.villagers.free + 1,
      },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          hasVillagers: true,
        },
      },
    }),
  },

  starvation: {
    id: "starvation",
    condition: (state) => {
      if (!state.flags.starvationActive) return false;
      const totalPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
      if (totalPopulation === 0) return false;
      
      const foodNeeded = totalPopulation;
      const availableFood = state.resources.food;
      
      return availableFood < foodNeeded;
    },
    triggerType: "resource",
    timeProbability: 0.5, // Check every 30 seconds on average when conditions are met
    message: "The village food stores have run empty. Without food, the harsh reality of survival takes its toll on the community.",
    triggered: false,
    priority: 10, // High priority
    repeatable: true,
    effect: (state) => {
      const totalPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
      const unfedPopulation = totalPopulation - state.resources.food;
      
      // 15% chance for each unfed villager to die from starvation
      let starvationDeaths = 0;
      for (let i = 0; i < unfedPopulation; i++) {
        if (Math.random() < 0.15) {
          starvationDeaths++;
        }
      }

      if (starvationDeaths > 0) {
        // Apply deaths to villagers
        let updatedVillagers = { ...state.villagers };
        let remainingDeaths = starvationDeaths;

        const villagerTypes = ['free', 'gatherer', 'hunter', 'iron_miner', 'coal_miner', 'sulfur_miner', 'silver_miner', 'gold_miner', 'obsidian_miner', 'adamant_miner', 'moonstone_miner', 'steel_forger'];
        
        for (const villagerType of villagerTypes) {
          if (remainingDeaths > 0 && updatedVillagers[villagerType as keyof typeof updatedVillagers] > 0) {
            const deaths = Math.min(remainingDeaths, updatedVillagers[villagerType as keyof typeof updatedVillagers]);
            updatedVillagers[villagerType as keyof typeof updatedVillagers] -= deaths;
            remainingDeaths -= deaths;
          }
          if (remainingDeaths === 0) break;
        }

        const message = starvationDeaths === 1 
          ? "One villager succumbs to starvation. The remaining villagers grow desperate." 
          : `${starvationDeaths} villagers starve to death. The survivors look gaunt and hollow-eyed.`;

        return {
          villagers: updatedVillagers,
          _logMessage: message,
        };
      } else {
        return {
          _logMessage: "Despite the lack of food, everyone survives another day, though they grow weaker and more desperate.",
        };
      }
    },
  },

  freezing: {
    id: "freezing",
    condition: (state) => {
      const totalPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
      return totalPopulation > 0 && state.resources.wood === 0;
    },
    triggerType: "resource",
    timeProbability: 0.1, // Check every minute when conditions are met
    message: "With no wood left for fires, the bitter cold creeps into every hut. Frost forms on the walls and the villagers struggle to survive the freezing night.",
    triggered: false,
    priority: 9, // High priority, but slightly less than starvation
    repeatable: true,
    effect: (state) => {
      const totalPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
      
      // 10% chance for each villager to die from cold
      let freezingDeaths = 0;
      for (let i = 0; i < totalPopulation; i++) {
        if (Math.random() < 0.1) {
          freezingDeaths++;
        }
      }

      if (freezingDeaths > 0) {
        // Apply deaths to villagers
        let updatedVillagers = { ...state.villagers };
        let remainingDeaths = freezingDeaths;

        const villagerTypes = ['free', 'gatherer', 'hunter', 'iron_miner', 'coal_miner', 'sulfur_miner', 'silver_miner', 'gold_miner', 'obsidian_miner', 'adamant_miner', 'moonstone_miner', 'steel_forger'];
        
        for (const villagerType of villagerTypes) {
          if (remainingDeaths > 0 && updatedVillagers[villagerType as keyof typeof updatedVillagers] > 0) {
            const deaths = Math.min(remainingDeaths, updatedVillagers[villagerType as keyof typeof updatedVillagers]);
            updatedVillagers[villagerType as keyof typeof updatedVillagers] -= deaths;
            remainingDeaths -= deaths;
          }
          if (remainingDeaths === 0) break;
        }

        const message = freezingDeaths === 1 
          ? "The bitter cold claims one villager's life. The others huddle together, shivering and afraid." 
          : `${freezingDeaths} villagers freeze to death in the night. The survivors are weak and traumatized by the loss.`;

        return {
          villagers: updatedVillagers,
          _logMessage: message,
        };
      } else {
        return {
          _logMessage: "The villagers endure another freezing night without wood. They huddle together for warmth, growing weaker but surviving.",
        };
      }
    },
  },
};
