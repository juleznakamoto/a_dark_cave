
import { GameEvent } from "./events";

export const storyEvents: Record<string, GameEvent> = {
  foodGone: {
    id: "foodGone",
    condition: (state) => state.resources.food > 50,
    triggerType: "resource",
    timeProbability: 15,
    message: [
      "At dawn, the food stores are lighter. Whispers lingered in the dark, voices that were never human.",
      "The villagers awaken to find food missing. Some claim they heard the susurrus of ancient tongues in the night.",
      "Half-seen shadows devoured what the stomachs of men should. Only the sound of faint chanting remained.",
    ][Math.floor(Math.random() * 3)],
    triggered: false,
    priority: 2,
    effect: (state) => ({
      resources: {
        ...state.resources,
        food:
          state.resources.food -
          Math.ceil(Math.random() * 50 * state.buildings.hut),
      },
    }),
  },

  villagerMissing: {
    id: "villagerMissing",
    condition: (state) => state.villagers.free > 0,
    triggerType: "resource",
    timeProbability: 10,
    message: [
      "One hut lies empty. Its occupant is gone.",
      "A villager is gone. Claw-like marks remain.",
      "A bed lies cold. The forest has claimed them.",
      "Mist shrouds an empty hut. The villager is gone.",
      "A hut stands silent. Meals lie untouched. They are gone.",
      "The wind moves through an empty hut. The villager is gone.",
      "A door of a hut stands ajar. Its occupant is gone.",
    ][Math.floor(Math.random() * 7)],
    triggered: false,
    priority: 2,
    effect: (state) => ({
      villagers: {
        ...state.villagers,
        free: Math.max(0, state.villagers.free - 1),
      },
    }),
  },

  ironGift: {
    id: "ironGift",
    condition: (state) => state.buildings.woodenHut >= 1,
    triggerType: "resource",
    timeProbability: 25,
    message: [
      "In the night, something left a heap of iron at the village's edge. No tracks lead away.",
      "A gift of iron gleams in the morning mist. None know who or what brought it."
    ][Math.floor(Math.random() * 3)],
    triggered: false,
    priority: 2,
    effect: (state) => ({
      resources: {
        ...state.resources,
        iron: state.resources.iron + 50 * state.buildings.woodenHut,
      },
    }),
  },

  paleFigure: {
    id: "paleFigure",
    condition: (state) =>
      state.buildings.woodenHut >= 2 && !state.relics.ravenfeather_mantle,
    triggerType: "resource",
    timeProbability: 20,
    title: "The Pale Figure",
    message:
      "In the misty morning several men claim to have seen a pale figure at the edge of the woods. The figure stands motionless, watching. What do you do?",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "investigate",
        label: "Investigate",
        effect: (state) => {
          const strength = state.stats.strength || 0;
          const luck = state.stats.luck || 0;
          // Base 50% chance
          const mantleChance = 0.3 + (strength + luck) * 0.005;

          const rand = Math.random();
          if (rand < mantleChance) {
            // Find the Ravenfeather Mantle (50% base + strength bonus)
            return {
              relics: {
                ...state.relics,
                ravenfeather_mantle: true,
              },
              _logMessage:
                "As your men approach, the pale figure beckons and vanishes. In its place lies a magnificent mantle woven from raven feathers, shimmering with an otherworldly power. When worn, it fills you with both fortune and strength.",
            };
          } else if (rand < 0.8) {
            // 1 man killed (30% chance)
            const updatedVillagers = {
              ...state.villagers,
              free: Math.max(0, state.villagers.free - 1),
            };
            return {
              villagers: updatedVillagers,
              _logMessage:
                "The investigation goes horribly wrong. One man screams in the mist and is never seen again. The others flee in terror.",
            };
          } else {
            // 2 men killed (20% chance)
            const updatedVillagers = {
              ...state.villagers,
              free: Math.max(0, state.villagers.free - 2),
            };
            return {
              villagers: updatedVillagers,
              _logMessage:
                "The pale figure moves with inhuman speed. Two men vanish into the mist, their screams echoing through the trees.",
            };
          }
        },
      },
      {
        id: "ignore",
        label: "Ignore it",
        effect: (state) => {
          const rand = Math.random();
          if (rand < 0.6) {
            // Nothing happens
            return {
              _logMessage:
                "The men stay close to the village. By evening, the figure is gone, and nothing more comes of it.",
            };
          } else {
            // 1 man found dead
            const updatedVillagers = {
              ...state.villagers,
              free: Math.max(0, state.villagers.free - 1),
            };
            return {
              villagers: updatedVillagers,
              _logMessage:
                "At dawn, one of the men who claimed to see the figure is found dead in his bed, his face frozen in terror.",
            };
          }
        },
      },
    ],
  },

  whispersBeneathHut: {
    id: "whispersBeneathHut",
    condition: (state) =>
      state.buildings.woodenHut >= 4 && !state.relics.whispering_amulet,
    triggerType: "resource",
    timeProbability: 20,
    title: "Whispers Beneath the Hut",
    message:
      "At night, faint whispers seem to rise from under the floor of one of your hut. The villagers are uneasy. Do you investigate?",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "investigateHut",
        label: "Investigate the whispers",
        effect: (state) => {
          // Open for custom effects
          return {
            relics: {
              ...state.relics,
              whispering_amulet: true,
            },
            _logMessage:
              "You lift the floorboards and find a strange amulet, faintly whispering. Its purpose is unclear...",
            // e.g., add relic to state: relics: {...state.relics, whisperingAmulet: true}
          };
        },
      },
      {
        id: "ignoreHut",
        label: "Leave it be",
        effect: (state) => {
          return {
            _logMessage:
              "You choose to leave the hut alone. The whispers fade by morning, but a chill remains in the air.",
          };
        },
      },
    ],
  },

  blackenedMirror: {
    id: "blackenedMirror",
    condition: (state) =>
      state.buildings.woodenHut >= 5 &&
      state.resources.iron >= 200 &&
      !state.relics.blackened_mirror,
    triggerType: "resource",
    timeProbability: 25,
    title: "The Blackened Mirror",
    message:
      "A wandering trader offers a tall, cracked mirror framed in black iron. It radiates a cold, unnatural aura. He claims it can give glimpses of the future.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "buyMirror",
        label: "Buy the mirror for 200 iron",
        effect: (state) => {
          return {
            resources: {
              ...state.resources,
              iron: state.resources.iron - 200,
            },
            stats: {
              ...state.stats,
              knowledge: (state.stats.knowledge || 0) + 10,
            },
            relics: {
              ...state.relics,
              blackened_mirror: true,
            },
            _logMessage:
              "You purchase the mirror. Its purpose and effects remain a mystery, but you feel your understanding of hidden things deepen (+10 Knowledge).",
          };
        },
      },
      {
        id: "refuseMirror",
        label: "Refuse the offer",
        effect: (state) => {
          return {
            _logMessage:
              "You decline the trader's offer. The mirror disappears into the night with him.",
          };
        },
      },
    ],
  },

  cthulhuFigure: {
    id: "cthulhuFigure",
    condition: (state) =>
      state.buildings.woodenHut >= 4 && !state.relics.wooden_figure,
    triggerType: "resource",
    timeProbability: 30,
    title: "A Strange Wooden Figure",
    message:
      "Near the edge of the village, a small wooden figure is discovered, carved with tentacled features. It emanates a strange aura. Do you keep it or discard it?",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "keepFigure",
        label: "Keep the figure",
        effect: (state) => {
          return {
            _logMessage:
              "You decide to keep the figure. Its strange aura makes the villagers uneasy...",
            // e.g., add figure to state: items: {...state.items, tentacledFigure: true}
          };
        },
      },
      {
        id: "discardFigure",
        label: "Discard it",
        effect: (state) => {
          return {
            relics: {
              ...state.relics,
              wooden_figure: true,
            },
            _logMessage:
              "You discard the figure. The forest seems to watch silently as it disappears.",
          };
        },
      },
    ],
  },

  wolfAttack: {
    id: "wolfAttack",
    condition: (state) => state.buildings.hut >= 3,
    triggerType: "resource",
    timeProbability: 30,
    title: "Wolf Attack",
    message:
      "In the dead of night, wolves emerge from the darkness, their eyes glowing with an unnatural hunger. Their howls echo with otherworldly malice as they circle your village.",
    triggered: false,
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "defendVillage",
        label: "Defend the village",
        effect: (state) => {
          const currentPopulation =
            state.villagers.free +
            state.villagers.gatherer +
            state.villagers.hunter;
          if (currentPopulation === 0) {
            return {
              _logMessage:
                "The wolves find an empty village and move on, disappointed by the lack of prey.",
            };
          }

          const strength = state.stats.strength || 0;

          // Check for victory: 10% base chance + 1% per strength point
          const victoryChance = 0.1 + strength * 0.01;

          if (Math.random() < victoryChance) {
            // Victory! Get Alpha's Hide
            return {
              relics: {
                ...state.relics,
                alphas_hide: true,
              },
              _logMessage:
                "Against all odds, your village manages to defeat the wolf pack! In a fierce battle, you slay the alpha wolf and claim its hide as a trophy. The Alpha's Hide radiates with primal power, granting you both fortune and strength.",
            };
          }

          // Base chance of casualties (70%), reduced by 5% per strength point, minimum 20%
          const casualtyChance = Math.max(0.2, 0.7 - strength * 0.02);

          let villagerDeaths = 0;
          let foodLoss = Math.floor(Math.random() * 201); // 0-200 food loss
          let hutDestroyed = false;

          // Determine villager casualties (1-6 potential deaths)
          const maxPotentialDeaths = Math.min(6, currentPopulation);
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          // If 2+ villagers die and there's a hut, 50% chance to destroy it
          if (villagerDeaths >= 2 && state.buildings.hut > 0) {
            if (Math.random() < 0.5) {
              hutDestroyed = true;
            }
          }

          // Apply deaths to villagers
          let updatedVillagers = { ...state.villagers };
          let remainingDeaths = villagerDeaths;

          // Remove villagers starting with free, then gatherers, then hunters
          if (remainingDeaths > 0 && updatedVillagers.free > 0) {
            const freeDeaths = Math.min(remainingDeaths, updatedVillagers.free);
            updatedVillagers.free -= freeDeaths;
            remainingDeaths -= freeDeaths;
          }

          if (remainingDeaths > 0 && updatedVillagers.gatherer > 0) {
            const gathererDeaths = Math.min(
              remainingDeaths,
              updatedVillagers.gatherer,
            );
            updatedVillagers.gatherer -= gathererDeaths;
            remainingDeaths -= gathererDeaths;
          }

          if (remainingDeaths > 0 && updatedVillagers.hunter > 0) {
            const hunterDeaths = Math.min(
              remainingDeaths,
              updatedVillagers.hunter,
            );
            updatedVillagers.hunter -= hunterDeaths;
            remainingDeaths -= hunterDeaths;
          }

          // Construct result message
          let message =
            "The village fights desperately against the possessed wolves. ";

          if (villagerDeaths === 0) {
            message +=
              "Miraculously, all villagers survive the attack, though shaken by the encounter.";
          } else if (villagerDeaths === 1) {
            message += "One villager falls to the wolves' supernatural fury.";
          } else {
            message += `${villagerDeaths} villagers are claimed by the wolves' unnatural hunger.`;
          }

          if (foodLoss > 0) {
            message += ` The wolves also devour ${foodLoss} units of food from your stores.`;
          }

          if (hutDestroyed) {
            message +=
              " In their rampage, the possessed wolves destroy one of your huts, leaving only splintered wood and claw marks.";
          }

          return {
            villagers: updatedVillagers,
            resources: {
              ...state.resources,
              food: Math.max(0, state.resources.food - foodLoss),
            },
            buildings: hutDestroyed
              ? {
                  ...state.buildings,
                    woodenHut: Math.max(0, state.buildings.woodenHut - 1),
                }
              : state.buildings,
            _logMessage: message,
          };
        },
      },
      {
        id: "hideAndWait",
        label: "Hide and wait it out",
        effect: (state) => {
          const currentPopulation =
            state.villagers.free +
            state.villagers.gatherer +
            state.villagers.hunter;
          if (currentPopulation === 0) {
            return {
              _logMessage:
                "The wolves find an empty village and move on, their supernatural hunger unsated.",
            };
          }

          // Hiding is more effective, lower casualty rate (60%)
          const strength = state.stats.strength || 0;
          const casualtyChance = Math.max(0.1, 0.6 - strength * 0.02);

          let villagerDeaths = 0;
          let foodLoss = Math.floor(Math.random() * 501) + 50; // 50-500 food loss (more than defending)
          let hutDestroyed = false;

          // Determine villager casualties (1-4 potential deaths)
          const maxPotentialDeaths = Math.min(4, currentPopulation);
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          // Apply deaths to villagers
          let updatedVillagers = { ...state.villagers };
          let remainingDeaths = villagerDeaths;

          // Remove villagers starting with free, then gatherers, then hunters
          if (remainingDeaths > 0 && updatedVillagers.free > 0) {
            const freeDeaths = Math.min(remainingDeaths, updatedVillagers.free);
            updatedVillagers.free -= freeDeaths;
            remainingDeaths -= freeDeaths;
          }

          if (remainingDeaths > 0 && updatedVillagers.gatherer > 0) {
            const gathererDeaths = Math.min(
              remainingDeaths,
              updatedVillagers.gatherer,
            );
            updatedVillagers.gatherer -= gathererDeaths;
            remainingDeaths -= gathererDeaths;
          }

          if (remainingDeaths > 0 && updatedVillagers.hunter > 0) {
            const hunterDeaths = Math.min(
              remainingDeaths,
              updatedVillagers.hunter,
            );
            updatedVillagers.hunter -= hunterDeaths;
            remainingDeaths -= hunterDeaths;
          }

          // Construct result message
          let message =
            "The villagers huddle in their huts as the wolves prowl outside, their claws scraping against doors and walls. ";

          if (villagerDeaths === 0) {
            message +=
              "By dawn, the wolves have departed, leaving only scratches and terror behind.";
          } else if (villagerDeaths === 1) {
            message +=
              "One villager who ventured out is found torn apart at sunrise.";
          } else {
            message += `${villagerDeaths} villagers are dragged from their hiding places, their screams echoing through the night.`;
          }

          message += ` The wolves ransack your food stores, consuming ${foodLoss} units.`;

          return {
            villagers: updatedVillagers,
            resources: {
              ...state.resources,
              food: Math.max(0, state.resources.food - foodLoss),
            },
            buildings: hutDestroyed
              ? {
                  ...state.buildings,
                    woodenHut: Math.max(0, state.buildings.woodenHut - 1),
                }
              : state.buildings,
            _logMessage: message,
          };
        },
      },
    ],
  },

  trinketFound: {
    id: "trinketFound",
    condition: (state) => false, // Only triggered by action effect
    triggerType: "action",
    title: "Old Trinket",
    message:
      "While gathering wood, you find an old trinket with glowing amber liquid inside. You drink it without hesitation. The liquid burns as it goes down, but you feel stronger than before. (+5 Strength)",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state) => {
      return {
        flags: {
          ...state.flags,
          trinketDrunk: true,
        },
        events: {
          ...state.events,
          trinket_found: true,
        },
        stats: {
          ...state.stats,
          strength: (state.stats.strength || 0) + 5,
        },
      };
    },
  },

  dreamMorrowind: {
    id: "dreamMorrowind",
    condition: (state) => state.buildings.woodenHut >= 1,
    triggerType: "time",
    timeProbability: 90,
    message:
      "Sleep drags you into a wasteland of ash and jagged stone. A red sky bleeds across the horizon, and enormous, insect-like shapes crawl in the distance. A low, ancient vibration hums through the ground. You wake with dust in your mouth and a lingering sense of unease.",
    triggered: false,
    priority: 1,
    repeatable: false,
    effect: (state) => ({
      events: {
        ...state.events,
        dream_morrowind: true,
      },
    }),
  },

  dreamOblivion: {
    id: "dreamOblivion",
    condition: (state) => state.buildings.woodenHut >= 1,
    triggerType: "time",
    timeProbability: 90,
    message:
      "You dream of a towering gate of brass and bone, weeping molten fire. Behind it, spiked towers and rivers of blood stretch into darkness. A voice calls from beyond the flames, hungry and silent. You wake in cold sweat, the echo of screaming still in your ears.",
    triggered: false,
    priority: 1,
    repeatable: false,
    effect: (state) => ({
      events: {
        ...state.events,
        dream_oblivion: true,
      },
    }),
  },

  dreamSkyrim: {
    id: "dreamSkyrim",
    condition: (state) => state.buildings.woodenHut >= 1,
    triggerType: "time",
    timeProbability: 90,
    message:
      "In sleep, cold winds lash your face. You stand atop a jagged cliff, snow and ash swirling around you. A colossal shadow passes overhead, scales glinting like iron in moonlight. A deep, ancient hum reverberates through your bones. You wake shivering, the chill lingering long after.",
    triggered: false,
    priority: 1,
    repeatable: false,
    effect: (state) => ({
      events: {
        ...state.events,
        dream_skyrim: true,
      },
    }),
  },

  findElderScroll: {
    id: "findElderScroll",
    condition: (state) =>
      state.events.dream_morrowind &&
      state.events.dream_oblivion &&
      state.events.dream_skyrim &&
      !state.relics.elder_scroll,
    triggerType: "time",
    timeProbability: 1,
    message:
      "Night drapes the village in an uneasy silence. As you pass a narrow path, something moves at the edge of your vision, like a shadow fleeing the firelight. You follow it, and there, upon the cold stones, lies an ancient scroll...",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state) => ({
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

  blacksmithHammer: {
    id: "blacksmithHammer",
    condition: (state) => false, // Only triggered by hunting action
    triggerType: "action",
    message:
      "Deep in the forest, you discover ancient ruins dominated by a massive stone furnace. Skeletal remains lie scattered about - the bones of what must have been a giant. Among the debris, a magnificent hammer catches the light, its head still bearing traces of ancient forge-fire. You take the Blacksmith Hammer, feeling its power flow through you. (+2 Strength, -10% crafting costs)",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state) => {
      return {
        tools: {
          ...state.tools,
          blacksmith_hammer: true,
        },
        events: {
          ...state.events,
          blacksmith_hammer_found: true,
        },
      };
    },
  },
};
