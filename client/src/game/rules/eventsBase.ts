
import { GameState } from "@shared/schema";
import { GameEvent } from "./events";

export const baseEvents: Record<string, GameEvent> = {
  strangerApproaches: {
    id: "strangerApproaches",
    condition: (state) => state.current_population < state.total_population,
    triggerType: "resource",
    timeProbability: (state) => {
      let baseProbability = 1;
      baseProbability *= Math.pow(0.9, state.buildings.hut);

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
    title: "Starvation Threatens",
    message: "The village food stores run dangerously low. Hungry eyes look toward you with desperate hope. Bellies growl and children cry. What will you do?",
    triggered: false,
    priority: 10, // High priority
    repeatable: true,
    choices: [
      {
        id: "rationFood",
        label: "Ration what food remains",
        effect: (state) => {
          const totalPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
          const unfedPopulation = totalPopulation - state.resources.food;
          
          // 10% chance for each unfed villager to die from rationing
          let starvationDeaths = 0;
          for (let i = 0; i < unfedPopulation; i++) {
            if (Math.random() < 0.1) {
              starvationDeaths++;
            }
          }

          if (starvationDeaths > 0) {
            // Apply deaths to villagers
            let updatedVillagers = { ...state.villagers };
            let remainingDeaths = starvationDeaths;

            const villagerTypes = ['free', 'gatherer', 'hunter', 'iron_miner', 'coal_miner', 'sulfur_miner', 'silver_miner', 'gold_miner', 'obsidian_miner', 'adamant_miner', 'moonstone_miner'];
            
            for (const villagerType of villagerTypes) {
              if (remainingDeaths > 0 && updatedVillagers[villagerType as keyof typeof updatedVillagers] > 0) {
                const deaths = Math.min(remainingDeaths, updatedVillagers[villagerType as keyof typeof updatedVillagers]);
                updatedVillagers[villagerType as keyof typeof updatedVillagers] -= deaths;
                remainingDeaths -= deaths;
              }
              if (remainingDeaths === 0) break;
            }

            const message = starvationDeaths === 1 
              ? "Despite your efforts to ration food, one villager succumbs to hunger. The others look gaunt but grateful for your leadership." 
              : `Despite careful rationing, ${starvationDeaths} villagers starve to death. The survivors appreciate your difficult decision.`;

            return {
              villagers: updatedVillagers,
              _logMessage: message,
            };
          } else {
            return {
              _logMessage: "Your careful rationing keeps everyone alive for now, though they remain weak with hunger. The villagers look to you with hope and trust.",
            };
          }
        },
      },
      {
        id: "doNothing",
        label: "Do nothing and hope for the best",
        effect: (state) => {
          const totalPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
          const unfedPopulation = totalPopulation - state.resources.food;
          
          // 25% chance for each unfed villager to die from neglect
          let starvationDeaths = 0;
          for (let i = 0; i < unfedPopulation; i++) {
            if (Math.random() < 0.25) {
              starvationDeaths++;
            }
          }

          if (starvationDeaths > 0) {
            // Apply deaths to villagers
            let updatedVillagers = { ...state.villagers };
            let remainingDeaths = starvationDeaths;

            const villagerTypes = ['free', 'gatherer', 'hunter', 'iron_miner', 'coal_miner', 'sulfur_miner', 'silver_miner', 'gold_miner', 'obsidian_miner', 'adamant_miner', 'moonstone_miner'];
            
            for (const villagerType of villagerTypes) {
              if (remainingDeaths > 0 && updatedVillagers[villagerType as keyof typeof updatedVillagers] > 0) {
                const deaths = Math.min(remainingDeaths, updatedVillagers[villagerType as keyof typeof updatedVillagers]);
                updatedVillagers[villagerType as keyof typeof updatedVillagers] -= deaths;
                remainingDeaths -= deaths;
              }
              if (remainingDeaths === 0) break;
            }

            const message = starvationDeaths === 1 
              ? "Without leadership, chaos ensues. One villager starves to death while others fight over scraps. The village blames you for your inaction." 
              : `Your lack of action leads to tragedy. ${starvationDeaths} villagers starve to death as desperation turns neighbor against neighbor.`;

            return {
              villagers: updatedVillagers,
              _logMessage: message,
            };
          } else {
            return {
              _logMessage: "Somehow, everyone survives another day, though tension fills the air. The villagers eye each other warily, and some whisper of your poor leadership.",
            };
          }
        },
      },
    ],
  },

  freezing: {
    id: "freezing",
    condition: (state) => {
      const totalPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
      return totalPopulation > 0 && state.resources.wood === 0;
    },
    triggerType: "resource",
    timeProbability: 1, // Check every minute when conditions are met
    title: "The Cold Bites Deep",
    message: "With no wood left for fires, the bitter cold creeps into every hut. Frost forms on the walls and the villagers huddle together for warmth. Their breath mists in the frigid air. How do you respond to this crisis?",
    triggered: false,
    priority: 9, // High priority, but slightly less than starvation
    repeatable: true,
    choices: [
      {
        id: "shareWarmth",
        label: "Organize everyone to share warmth",
        effect: (state) => {
          const totalPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
          
          // 5% chance for each villager to die from cold even with organization
          let freezingDeaths = 0;
          for (let i = 0; i < totalPopulation; i++) {
            if (Math.random() < 0.05) {
              freezingDeaths++;
            }
          }

          if (freezingDeaths > 0) {
            // Apply deaths to villagers
            let updatedVillagers = { ...state.villagers };
            let remainingDeaths = freezingDeaths;

            const villagerTypes = ['free', 'gatherer', 'hunter', 'iron_miner', 'coal_miner', 'sulfur_miner', 'silver_miner', 'gold_miner', 'obsidian_miner', 'adamant_miner', 'moonstone_miner'];
            
            for (const villagerType of villagerTypes) {
              if (remainingDeaths > 0 && updatedVillagers[villagerType as keyof typeof updatedVillagers] > 0) {
                const deaths = Math.min(remainingDeaths, updatedVillagers[villagerType as keyof typeof updatedVillagers]);
                updatedVillagers[villagerType as keyof typeof updatedVillagers] -= deaths;
                remainingDeaths -= deaths;
              }
              if (remainingDeaths === 0) break;
            }

            const message = freezingDeaths === 1 
              ? "Despite your efforts to organize shared warmth, one villager succumbs to the bitter cold. The others are grateful for your leadership in this dark time." 
              : `Even with shared warmth, ${freezingDeaths} villagers freeze to death in the night. The survivors huddle closer, thankful for your guidance.`;

            return {
              villagers: updatedVillagers,
              _logMessage: message,
            };
          } else {
            return {
              _logMessage: "Your quick thinking saves lives. The villagers huddle together in the largest hut, sharing body heat and comfort. Though cold, everyone survives the night.",
            };
          }
        },
      },
      {
        id: "burnFurniture",
        label: "Burn furniture and tools for warmth",
        effect: (state) => {
          const totalPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
          
          // Very low chance of death when burning items for warmth
          let freezingDeaths = 0;
          for (let i = 0; i < totalPopulation; i++) {
            if (Math.random() < 0.02) {
              freezingDeaths++;
            }
          }

          // Lose some iron (representing burned tools/furniture)
          const ironLoss = Math.min(state.resources.iron, 20);

          if (freezingDeaths > 0) {
            // Apply deaths to villagers
            let updatedVillagers = { ...state.villagers };
            let remainingDeaths = freezingDeaths;

            const villagerTypes = ['free', 'gatherer', 'hunter', 'iron_miner', 'coal_miner', 'sulfur_miner', 'silver_miner', 'gold_miner', 'obsidian_miner', 'adamant_miner', 'moonstone_miner'];
            
            for (const villagerType of villagerTypes) {
              if (remainingDeaths > 0 && updatedVillagers[villagerType as keyof typeof updatedVillagers] > 0) {
                const deaths = Math.min(remainingDeaths, updatedVillagers[villagerType as keyof typeof updatedVillagers]);
                updatedVillagers[villagerType as keyof typeof updatedVillagers] -= deaths;
                remainingDeaths -= deaths;
              }
              if (remainingDeaths === 0) break;
            }

            const message = freezingDeaths === 1 
              ? `The makeshift fires from burned furniture save most lives, but one villager still freezes to death. You lose ${ironLoss} iron worth of tools and furniture.` 
              : `The emergency fires help, but ${freezingDeaths} villagers still freeze to death. You lose ${ironLoss} iron worth of tools and furniture.`;

            return {
              villagers: updatedVillagers,
              resources: {
                ...state.resources,
                iron: state.resources.iron - ironLoss,
              },
              _logMessage: message,
            };
          } else {
            return {
              resources: {
                ...state.resources,
                iron: state.resources.iron - ironLoss,
              },
              _logMessage: `Your desperate measure works! Breaking apart furniture and tools provides enough fuel for warming fires. Everyone survives, though you lose ${ironLoss} iron worth of valuable items.`,
            };
          }
        },
      },
      {
        id: "endureTheCold",
        label: "Endure the cold and wait for dawn",
        effect: (state) => {
          const totalPopulation = Object.values(state.villagers).reduce((sum, count) => sum + (count || 0), 0);
          
          // 15% chance for each villager to die from cold when doing nothing
          let freezingDeaths = 0;
          for (let i = 0; i < totalPopulation; i++) {
            if (Math.random() < 0.15) {
              freezingDeaths++;
            }
          }

          if (freezingDeaths > 0) {
            // Apply deaths to villagers
            let updatedVillagers = { ...state.villagers };
            let remainingDeaths = freezingDeaths;

            const villagerTypes = ['free', 'gatherer', 'hunter', 'iron_miner', 'coal_miner', 'sulfur_miner', 'silver_miner', 'gold_miner', 'obsidian_miner', 'adamant_miner', 'moonstone_miner'];
            
            for (const villagerType of villagerTypes) {
              if (remainingDeaths > 0 && updatedVillagers[villagerType as keyof typeof updatedVillagers] > 0) {
                const deaths = Math.min(remainingDeaths, updatedVillagers[villagerType as keyof typeof updatedVillagers]);
                updatedVillagers[villagerType as keyof typeof updatedVillagers] -= deaths;
                remainingDeaths -= deaths;
              }
              if (remainingDeaths === 0) break;
            }

            const message = freezingDeaths === 1 
              ? "The long, cold night claims one life. By dawn, you find one villager frozen stiff in their hut. The others are weak but alive." 
              : `The brutal night takes a heavy toll. ${freezingDeaths} villagers freeze to death before dawn breaks. The survivors eye you with resentment.`;

            return {
              villagers: updatedVillagers,
              _logMessage: message,
            };
          } else {
            return {
              _logMessage: "Against all odds, everyone survives the frozen night. The villagers are weak and shivering, but alive. They look at you with a mixture of relief and reproach.",
            };
          }
        },
      },
    ],
  },
};
