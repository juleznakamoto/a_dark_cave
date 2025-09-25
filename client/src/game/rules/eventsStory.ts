import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

export const storyEvents: Record<string, GameEvent> = {
  foodGone: {
    id: "foodGone",
    condition: (state: GameState) => state.resources.food > 50,
    triggerType: "resource",
    timeProbability: 20,
    message: [
      "Strange whispers were heard at night. At dawn, food stores are lighter.",
      "Villagers wake to find food missing. Some heard ancient tongues in the night.",
      "By morning, food stores are thinned. Some murmur of inhuman voices heard in the dark.",
    ][Math.floor(Math.random() * 3)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        food:
          state.resources.food -
          Math.min(
            state.resources.food,
            Math.ceil(Math.random() * 50 * state.buildings.woodenHut),
          ),
      },
    }),
  },

  villagerMissing: {
    id: "villagerMissing",
    condition: (state: GameState) => state.villagers.free > 0,
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
    effect: (state: GameState) => ({
      villagers: {
        ...state.villagers,
        free: Math.max(0, state.villagers.free - 1),
      },
    }),
  },

  ironGift: {
    id: "ironGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 1,
    triggerType: "resource",
    timeProbability: 30,
    message: [
      "In the night, something left a heap of iron at the village's edge. No tracks lead away.",
      "A gift of iron gleams in the morning mist. None know who or what brought it.",
    ][Math.floor(Math.random() * 2)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        iron: state.resources.iron + 25 * state.buildings.woodenHut,
      },
    }),
  },

  steelGift: {
    id: "steelGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 5,
    triggerType: "resource",
    timeProbability: 30,
    message: [
      "At dawn, refined steel bars lie stacked at the village gates. Nobody knows where they come from.",
      "A mysterious benefactor has left gleaming steel ingots at the edge of the village.",
    ][Math.floor(Math.random() * 2)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        steel: state.resources.steel + 15 * state.buildings.woodenHut,
      },
    }),
  },

  obsidianGift: {
    id: "obsidianGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 8,
    triggerType: "resource",
    timeProbability: 30,
    message: [
      "By dawn, obsidian shards have been placed in the earth around your village, like a silent message left behind.",
      "In the morning light, you notice obsidian laid carefully into the soil, surrounding your village.",
    ][Math.floor(Math.random() * 2)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        obsidian: state.resources.obsidian + 10 * state.buildings.woodenHut,
      },
    }),
  },

  adamantGift: {
    id: "adamantGift",
    condition: (state: GameState) => state.buildings.woodenHut >= 10,
    triggerType: "resource",
    timeProbability: 30,
    message: [
      "By morning, raw adamant lies behind one of the huts of the village.",
      "When dawn breaks, fragments of adamant protrude from the earth around your settlement.",
    ][Math.floor(Math.random() * 2)],
    triggered: false,
    priority: 2,
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        adamant: state.resources.adamant + 8 * state.buildings.woodenHut,
      },
    }),
  },

  paleFigure: {
    id: "paleFigure",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 2 && !state.relics.ravenfeather_mantle,
    triggerType: "resource",
    timeProbability: 35,
    title: "The Pale Figure",
    message: [
      "At dawn, men glimpse a pale, slender figure at the woods’ edge. It stands watching. What do you do?",
      "In the grey morning, a pale and slender shape lingers at the treeline, unmoving. What do you do?",
      "Villagers report of a pale, slender figure in the mist, silent at the forest’s edge. What do you do?",
    ][Math.floor(Math.random() * 3)],
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "investigate",
        label: "Investigate",
        effect: (state: GameState) => {
          const strength = state.stats.strength || 0;
          const luck = state.stats.luck || 0;
          // Base 50% chance
          const mantleChance = 0.2 + (strength + luck) * 0.005;

          const rand = Math.random();
          if (rand < mantleChance) {
            // Find the Ravenfeather Mantle (50% base + strength bonus)
            return {
              relics: {
                ...state.relics,
                ravenfeather_mantle: true,
              },
              _logMessage:
                "As your men near, the pale figure beckons and vanishes. In its place lies a raven-feather mantle, shimmering with otherworldly power.",
            };
          } else if (rand < 0.7) {
            return {
              ...killVillagers(state, 1),
              _logMessage:
                "The investigation goes horribly wrong. One man screams in the mist and is never seen again. The others flee in terror.",
            };
          } else {
            return {
              ...killVillagers(state, 2),
              _logMessage:
                "The pale figure moves with inhuman speed. Two men vanish into the mist, their screams echoing through the trees.",
            };
          }
        },
      },
      {
        id: "ignore",
        label: "Ignore it",
        effect: (state: GameState) => {
          const rand = Math.random();
          if (rand < 0.6) {
            // Nothing happens
            return {
              _logMessage:
                "The men stay close to the village. By evening, the figure is gone, and nothing more comes of it.",
            };
          } else {
            // 1 man found dead
            return {
              ...killVillagers(state, 1),
              _logMessage:
                "At dawn, one of the men who claimed to have seen the figure is found dead in his bed, his face frozen in terror.",
            };
          }
        },
      },
    ],
  },

  whispersBeneathHut: {
    id: "whispersBeneathHut",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 4 && !state.relics.whispering_amulet,
    triggerType: "resource",
    timeProbability: 25,
    title: "Whispers Beneath the Hut",
    message:
      "At night, faint whispers seem to rise from under the floor of one of the huts. The villagers are uneasy. Do you investigate?",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "investigateHut",
        label: "Investigate the whispers",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              whispering_amulet: true,
            },
            _logMessage:
              "You lift the floorboards and find a strange amulet, faintly whispering. Its purpose is unclear...",
          };
        },
      },
      {
        id: "ignoreHut",
        label: "Leave it be",
        effect: (state: GameState) => {
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
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 5 &&
      state.resources.iron >= 200 &&
      !state.relics.blackened_mirror,
    triggerType: "resource",
    timeProbability: 30,
    title: "The Blackened Mirror",
    message:
      "A wandering tradesman offers a tall, cracked mirror framed in black iron. It radiates a cold, unnatural aura. He claims it can give glimpses of the future.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "buyMirror",
        label: "Buy for 200 iron",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              iron: state.resources.iron - 200,
            },
            relics: {
              ...state.relics,
              blackened_mirror: true,
            },
            _logMessage:
              "You purchase the mirror. Its dark surface shimmers with hidden truths, and glimpses of your own future are revealed, nudging your sanity toward the edge.",
          };
        },
      },
      {
        id: "refuseMirror",
        label: "Refuse the offer",
        effect: (state: GameState) => {
          return {
            _logMessage: "You decline the trader's offer. The mirror disappears into the night with him.",
          };
        },
      },
    ],
  },

  cthulhuFigure: {
    id: "cthulhuFigure",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 4 && !state.relics.wooden_figure,
    triggerType: "resource",
    timeProbability: 45,
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
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              wooden_figure: true,
            },
            _logMessage:
              "You decide to keep the figure. Its strange aura makes the villagers uneasy...",
          };
        },
      },
      {
        id: "discardFigure",
        label: "Discard it",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You discard the figure. The forest seems to watch silently as it disappears.",
          };
        },
      },
    ],
  },

  wolfAttack: {
    id: "wolfAttack",
    condition: (state: GameState) => state.buildings.woodenHut >= 3,
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
        effect: (state: GameState) => {
          const currentPopulation =
            state.current_population ||
            Object.values(state.villagers).reduce(
              (sum, count) => sum + (count || 0),
              0,
            );
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
          let foodLoss = Math.min(
            state.resources.food,
            50 + Math.floor(Math.random() * 251),
          ); // 50-300 food loss
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
          const deathResult = killVillagers(state, villagerDeaths);

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
            ...deathResult,
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
        effect: (state: GameState) => {
          const currentPopulation =
            state.current_population ||
            Object.values(state.villagers).reduce(
              (sum, count) => sum + (count || 0),
              0,
            );
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
          const deathResult = killVillagers(state, villagerDeaths);

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
            ...deathResult,
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

  dreamMorrowind: {
    id: "dreamMorrowind",
    condition: (state: GameState) => state.buildings.woodenHut >= 3,
    triggerType: "time",
    timeProbability: 90,
    message:
      "Sleep drags you into a wasteland of ash and jagged stone. A red sky bleeds across the horizon, and enormous, insect-like shapes crawl in the distance. A low, ancient vibration hums through the ground. You wake with dust in your mouth and a lingering sense of unease.",
    triggered: false,
    priority: 1,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        dream_morrowind: true,
      },
    }),
  },

  dreamOblivion: {
    id: "dreamOblivion",
    condition: (state: GameState) => state.buildings.woodenHut >= 4,
    triggerType: "time",
    timeProbability: 90,
    message:
      "You dream of a towering gate of brass and bone, weeping molten fire. Behind it, spiked towers and rivers of blood stretch into darkness. A voice calls from beyond the flames, hungry and silent. You wake in cold sweat, the echo of screaming still in your ears.",
    triggered: false,
    priority: 1,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        dream_oblivion: true,
      },
    }),
  },

  dreamSkyrim: {
    id: "dreamSkyrim",
    condition: (state: GameState) => state.buildings.woodenHut >= 5,
    triggerType: "time",
    timeProbability: 90,
    message:
      "In sleep, cold winds lash your face. You stand atop a jagged cliff, snow and ash swirling around you. A colossal shadow passes overhead, scales glinting like iron in moonlight. A deep, ancient hum reverberates through your bones. You wake shivering, the chill lingering long after.",
    triggered: false,
    priority: 1,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        dream_skyrim: true,
      },
    }),
  },

  findElderScroll: {
    id: "findElderScroll",
    condition: (state: GameState) =>
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

  blacksmithHammer: {
    id: "blacksmithHammer",
    condition: (state: GameState) => false, // Only triggered by hunting action
    triggerType: "action",
    message:
      "Deep in the forest, you discover ancient ruins dominated by a massive stone furnace. Skeletal remains lie scattered about - the bones of what must have been a giant. Among the debris, a magnificent blacksmith hammer catches the light, its head still bearing traces of ancient forge-fire. You take the hammer, feeling its power flow through you.",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        relics: {
          ...state.relics,
          blacksmith_hammer: true,
        },
        events: {
          ...state.events,
          blacksmith_hammer_found: true,
        },
      };
    },
  },

  offerToTheForestGods: {
    id: "offerToTheForestGods",
    condition: (state: GameState) =>
      state.current_population > 6 &&
      !state.relics.ebony_ring &&
      state.buildings.altar == 1,
    triggerType: "resource",
    timeProbability: 40,
    title: "Offer to the Forest Gods",
    message:
      "While hunting, the villagers report unsettling figures in the forest. They are terrified. The village elders say the gods of the forest demand four villagers as sacrifice to restore peace.",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "sacrifice",
        label: "Sacrifice 4 villagers",
        effect: (state: GameState) => {
          const successChance = 0.35;
          const rand = Math.random();

          // Kill 4 villagers first
          const deathResult = killVillagers(state, 4);

          if (rand < successChance) {
            // Success: event resolved, get ebony ring
            return {
              ...deathResult,
              relics: {
                ...state.relics,
                ebony_ring: true,
              },
              _logMessage:
                "The forest accepts your sacrifice. The figures vanish, and an ebony ring is found on the altar where the villagers were offered. Peace returns to the woods.",
            };
          } else {
            // Failure: additional suicides
            const additionalDeaths = Math.floor(Math.random() * 5) + 2; // 2-6 additional deaths
            const totalDeathResult = killVillagers(
              {
                ...state,
                villagers: deathResult.villagers || state.villagers,
              },
              additionalDeaths,
            );

            return {
              villagers: totalDeathResult.villagers,
              relics: {
                ...state.relics,
                ebony_ring: true,
              },
              _logMessage: `The forest accepts your sacrifice. The figures vanish, and an ebony ring is found on the altar where the villagers were offered. But the horror of the sacrifice drives ${additionalDeaths} villagers to take their own lives in despair.`,
            };
          }
        },
      },
      {
        id: "refuse",
        label: "Do not make sacrifices",
        effect: (state: GameState) => {
          const successChance = 0.1;
          const nothingChance = 0.4;
          const rand = Math.random();

          if (rand < successChance) {
            // Best outcome: event resolved, get ebony ring
            return {
              relics: {
                ...state.relics,
                ebony_ring: true,
              },
              _logMessage:
                "Your refusal to sacrifice innocent lives somehow pleases the forest gods. The appearances vanish, and you find an ebony ring left as a gift. Your moral stand has been rewarded.",
            };
          } else if (rand < successChance + nothingChance) {
            // Nothing happens, event remains active
            return {
              _logMessage:
                "You refuse the sacrifice. The forest remains silent for now. The threat lingers...",
            };
          } else {
            // Villagers disappear
            const disappearances = Math.floor(Math.random() * 2) + 1; // 1-2 villagers
            const deathResult = killVillagers(state, disappearances);

            return {
              ...deathResult,
              _logMessage: `You refuse the sacrifice. During the night, ${disappearances} villager${disappearances > 1 ? "s" : ""} wander${disappearances === 1 ? "s" : ""} into the woods as if sleepwalking, drawn by a voice only they could hear. They are never seen again.`,
            };
          }
        },
      },
    ],
    fallbackChoice: {
      id: "noDecision",
      label: "No Decision Made",
      effect: (state: GameState) => {
        const departures = Math.floor(Math.random() * 3) + 2; // 2-4 villagers
        const deathResult = killVillagers(state, departures);

        return {
          ...deathResult,
          _logMessage: `Your indecision angers the villagers. ${departures} villagers, frustrated with your lack of leadership during this crisis, pack their belongings and leave the village in disgust.`,
        };
      },
    },
  },

  madBeduine: {
    id: "madBeduine",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 8 && !state.relics.unnamed_book,
    triggerType: "resource",
    timeProbability: 35,
    title: "The Mad Beduine",
    message:
      "As evening falls, a robed figure approaches from the wilderness. His eyes burn with madness as he mutters in a foreign tongue, gestures sharp and unsettling. The villagers grow uneasy. Do you allow this Beduine to stay the night?",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "allowStay",
        label: "Allow him to stay",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              unnamed_book: true,
            },
            _logMessage:
              "You grant the stranger shelter. At dawn, he has vanished. Only his robes remain, and within them lies a book bound in human skin. Its pages whisper forbidden knowledge.",
          };
        },
      },
      {
        id: "turnAway",
        label: "Turn him away",
        effect: (state: GameState) => {
          const villagerDeaths = Math.floor(Math.random() * 5) + 1; // 1-5 villagers
          const hutDestruction = Math.floor(Math.random() * 2) + 1; // 1-2 huts

          const deathResult = killVillagers(state, villagerDeaths);

          return {
            ...deathResult,
            buildings: {
              ...state.buildings,
              woodenHut: Math.max(
                0,
                state.buildings.woodenHut - hutDestruction,
              ),
            },
            _logMessage: `You refuse the stranger entry. He leaves screaming curses in his alien tongue, echoing like the wailing of the damned. Before dawn, a tribe of cannibals descends as if summoned by his cries, killing ${villagerDeaths} and destroying ${hutDestruction} hut${hutDestruction > 1 ? "s" : ""} before vanishing into the wilds.`,
          };
        },
      },
    ],
  },

  hiddenLake: {
    id: "hiddenLake",
    condition: (state: GameState) =>
      state.flags.forestUnlocked && !state.relics.cracked_crown,
    triggerType: "resource",
    timeProbability: 35,
    title: "The Hidden Lake",
    message:
      "While gathering wood deep in the forest, your villagers discover a pristine lake hidden among ancient trees. The water is eerily clear and still. One swears he saw a woman-like figure surface briefly, her gaze beautiful yet inhuman. What do you do?",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "investigate",
        label: "Investigate the lake",
        effect: (state: GameState) => {
          const strength = state.stats.strength || 0;
          const successChance = 0.25 + strength * 0.01; // 25% + 1% per strength point
          const fleeChance = 0.2;
          const rand = Math.random();

          if (rand < successChance) {
            return {
              relics: {
                ...state.relics,
                cracked_crown: true,
              },
              _logMessage:
                "Your men approach cautiously. The creature emerges from the depths as they enter the lake and strikes with fury, but your villagers' strength prevails. At the bottom of the lake they uncover countless human bones and a cracked golden crown. The Cracked Crown radiates ancient power.",
            };
          } else if (rand < successChance + fleeChance) {
            return {
              _logMessage:
                "Your men wade into the waters, but the creature bursts forth with inhuman speed. Her beauty twists into rows of teeth and glowing eyes. Terrified, your villagers flee and vow never to speak of it again.",
            };
          } else {
            const drownedCount = Math.floor(Math.random() * 4) + 1;
            const deathResult = killVillagers(state, drownedCount);

            return {
              ...deathResult,
              _logMessage: `The creature rises like a nightmare, beauty masking deadly intent. With unnatural strength, she drags ${drownedCount} villager${drownedCount > 1 ? "s" : ""} beneath the waters. Only ripples and faint screams remain as the rest flee in terror.`,
            };
          }
        },
      },
      {
        id: "avoidLake",
        label: "Avoid the lake",
        effect: (state: GameState) => {
          const successChance = 0.4;
          const luck = state.stats.luck || 0;
          const rand = Math.random();

          if (rand < successChance + (luck * 0.01)) {
            return {
              _logMessage:
                "You order your villagers to avoid the lake. Some grumble about lost opportunities, but they obey. Its secrets remain hidden beneath still waters. Your caution might have spared lives.",
            };
          } else {
            const deathResult = killVillagers(state, 1);

            return {
              ...deathResult,
              _logMessage:
                "You forbid any approach, but the villager who claimed to have seen the creature cannot resist. One night he sneaks away, never to return. At dawn, only his clothes lie at the water's edge.",
            };
          }
        },
      },
    ],
  },

  coinOfDrownedChoice: {
    id: "coinOfDrownedChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration
    triggerType: "action",
    title: "The Coin of Drowned",
    message:
      "Among the rubble of the fogotten city, you find a peculiar ring that drips constantly with water, despite there being no source. Do you dare to keep it?",
    triggered: false,
    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepCoin",
        label: "Keep the ring",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              coin_of_drowned: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                coinOfDrownedChoice: true,
              },
            },
            _logMessage:
              "You slip the ring onto your finger. Water continues to drip from it continuously, never stopping.",
          };
        },
      },
      {
        id: "leaveCoin",
        label: "Leave it behind",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                coinOfDrownedChoice: true,
              },
            },
            _logMessage:
              "You decide the risk is too great. As you turn away, you hear a faint splash behind you, as if something has fallen into deep water, though no water is nearby.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "leaveCoin",
      label: "Leave it behind",
      effect: (state: GameState) => {
        const deathResult = killVillagers(state, 1);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              coinOfDrownedChoice: true,
            },
          },
          _logMessage:
            "Your hesitation proves fatal. One of your men, unable to resist the mysterious ring's pull, picks it up despite your indecision. Immediately, water begins pouring from his mouth in an endless torrent. He drowns on dry land as the cursed ring claims its price.",
        };
      },
    },
  },

  shadowFluteChoice: {
    id: "shadowFluteChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration
    triggerType: "action",
    title: "The Shadow Flute",
    message:
      "You discover a bone flute of disturbing craftsmanship. When you pick it up and play it, the shadows around you begin to move in unnatural ways, as if dancing to a melody. Do you keep the instrument?",
    triggered: false,
    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepFlute",
        label: "Keep the flute",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              shadow_flute: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                shadowFluteChoice: true,
              },
            },
            _logMessage:
              "You keep the bone flute. Its tunes are beautiful, yet there's a subtle dissonance that gnaws quietly at your mind.",
          };
        },
      },
      {
        id: "leaveFlute",
        label: "Leave it behind",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                shadowFluteChoice: true,
              },
            },
            _logMessage:
              "You set the flute back down carefully. The shadows return to their natural stillness, and the oppressive atmosphere lifts.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "leaveFlute",
      label: "Leave it behind",
      effect: (state: GameState) => {
        const devoured = Math.floor(Math.random() * 3) + 2; // 2-4 villagers
        const deathResult = killVillagers(state, devoured);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              shadowFluteChoice: true,
            },
          },
          _logMessage:
            "Your hesitation proves costly. The shadows grow hungry and violent, writhing with unnatural life. They surge forward and devour 2 members of your fellowship, pulling them into the darkness between worlds. Their screams echo briefly before being swallowed by silence.",
        };
      },
    },
  },

  hollowKingsScepterChoice: {
    id: "hollowKingsScepterChoice",
    condition: (state: GameState) => false, // Only triggered by cave exploration
    triggerType: "action",
    title: "The Hollow King's Scepter",
    message:
      "In the throne room of the ruined citadel, you find a magnificent scepter of obsidian. This must have belonged to the king of this lost city. Dark knowledge flows from it, but so does terrible madness. Do you keep it?",
    triggered: false,
    priority: 5,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "keepScepter",
        label: "Claim the scepter",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              hollow_kings_scepter: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                hollowKingsScepterChoice: true,
              },
            },
            _logMessage:
              "You grasp the Hollow King's Scepter, feeling immense power flow through you. Ancient knowledge floods your mind, along with the king's memories of his final, maddening days.",
          };
        },
      },
      {
        id: "leaveScepter",
        label: "Leave the throne undisturbed",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                hollowKingsScepterChoice: true,
              },
            },
            _logMessage:
              "You decide to leave the dead king's scepter where it belongs. As you turn away, you swear you hear a faint whisper of disappointment echoing through the empty throne room.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "leaveScepter",
      label: "Leave the throne undisturbed",
      effect: (state: GameState) => {
        const deaths = Math.floor(Math.random() * 5) + 4; // 4-8 villagers
        const deathResult = killVillagers(state, deaths);
        return {
          ...deathResult,
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              hollowKingsScepterChoice: true,
            },
          },
          _logMessage:
            `As you stand frozen in indecision, your men grow impatient and greedy. One reaches for the scepter, then another. Soon they are fighting viciously over who should claim it. In the bloody melee that follows ${deaths} of your fellowship lie dead on the ancient throne room floor, their blood mixing with the dust of ages.`,
        };
      },
    },
  },
};