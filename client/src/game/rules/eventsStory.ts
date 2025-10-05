import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getTotalStrength, getTotalLuck } from "./effects";
import { getMaxPopulation } from "@/game/population";

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
      "A hut stands silent. Meals lie untouched. They are gone.",
      "The wind moves through an empty hut. The villager is gone.",
      "A door of a hut stands ajar. Its occupant is gone.",
    ][Math.floor(Math.random() * 5)],
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
    relevant_stats: ["strength", "luck"],
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
          const strength = getTotalStrength(state);
          const luck = getTotalLuck(state);
          // Base 20% chance + 1 % per strength 0.5 % per luck
          const mantleChance = 0.2 + strength + luck * 0.005;

          const rand = Math.random();
          if (rand < mantleChance) {
            return {
              relics: {
                ...state.relics,
                ravenfeather_mantle: true,
              },
              _logMessage:
                "As your men near, the pale figure beckons and vanishes. In its place lies a raven-feather mantle, shimmering with otherworldly power.",
            };
          } else if (rand < 0.6) {
            return {
              ...killVillagers(state, 1),
              _logMessage:
                "The investigation goes horribly wrong. One man screams in the mist and is never seen again. The others flee in terror.",
            };
          } else {
            const deaths =
              2 + Math.floor(Math.random() * state.buildings.woodenHut);
            return {
              ...killVillagers(state, deaths),
              _logMessage: `The pale figure moves with inhuman speed. ${deaths} men vanish into the mist, their screams echoing through the trees.`,
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

  ringOfClarityFound: {
    id: "ringOfClarityFound",
    condition: (state: GameState) => false, // Only triggered by sacrifice actions
    triggerType: "action",
    title: "Ring of Clarity",
    message:
      "As the ritual concludes, something glints among the ashes of the altar. A crystal-clear ring catches the light - its surface perfectly smooth and radiating a sense of peace and mental clarity.",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        relics: {
          ...state.relics,
          ring_of_clarity: true,
        },
        _logMessage:
          "You slip the Ring of Clarity onto your finger. Immediately, your thoughts become clearer and the dark whispers in your mind quiet to a whisper.",
      };
    },
  },

  blackenedMirror: {
    id: "blackenedMirror",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 5 &&
      state.resources.iron >= 500 &&
      !state.relics.blackened_mirror,
    triggerType: "resource",
    timeProbability: 35,
    title: "The Blackened Mirror",
    message:
      "A wandering tradesman offers a tall, cracked mirror framed in black iron. It radiates a cold, unnatural aura. He claims it can give glimpses of the future.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "buyMirror",
        label: "Buy the mirror for 500 iron",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              iron: state.resources.iron - 500,
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
            _logMessage:
              "You decline the trader's offer. The mirror disappears into the night with him.",
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
    timeProbability: 0.045,
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
      "Close to midnight, wolves emerge from the darkness, their eyes glowing with unnatural hunger. Their howls echo with filled with malice as they circle your village.",
    triggered: false,
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "defendVillage",
        relevant_stats: ["strength"],
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

          const strength = getTotalStrength(state);

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
                "Your village manages to defeat the wolf pack! You slay the alpha wolf and claim its hide as a trophy. It radiates with primal power.",
            };
          }

          // Base chance of casualties (70%), reduced by 2% per strength point, minimum 20%
          const casualtyChance = Math.max(0.2, 0.7 - strength * 0.02);

          let villagerDeaths = 0;
          let foodLoss = Math.min(
            state.resources.food,
            state.buildings.woodenHut * 25 + Math.floor(Math.random() * 251),
          );
          let hutDestroyed = false;

          // Determine villager casualties
          const maxPotentialDeaths = Math.min(
            6 + state.buildings.woodenHut,
            currentPopulation,
          );
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
          let message = "The village fights desperately against the wolves. ";

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
              " In their rampage, the possessed wolves destroy one of your huts, leaving only splintered wood.";
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

          // Hiding is more effective, lower casualty rate (50%)
          const strength = getTotalStrength(state);
          const casualtyChance = Math.max(0.1, 0.5 - strength * 0.02);

          let villagerDeaths = 0;
          let foodLoss = Math.floor(Math.random() * 501) + 50; // 50-500 food loss (more than defending)
          let hutDestroyed = false;

          // Determine villager casualties (1-4 potential deaths)
          const maxPotentialDeaths = Math.min(
            2 + state.buildings.woodenHut,
            currentPopulation,
          );
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
    timeProbability: 80,
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
    condition: (state: GameState) => state.buildings.woodenHut >= 5,
    triggerType: "time",
    timeProbability: 70,
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
    condition: (state: GameState) => state.buildings.woodenHut >= 7,
    triggerType: "time",
    timeProbability: 60,
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
      "During the night as you pass a narrow path, something moves at the edge of your vision, like a shadow fleeing the firelight. You follow it, and there, upon the cold stones, lies an ancient scroll...",
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

  offerToTheForestGods: {
    id: "offerToTheForestGods",
    relevant_stats: ["knowledge"],
    condition: (state: GameState) =>
      state.current_population > 10 &&
      !state.relics.ebony_ring &&
      state.buildings.altar == 1,
    triggerType: "resource",
    timeProbability: 30,
    title: "Offer to the Forest Gods",
    message:
      "While hunting, the villagers report unsettling figures in the forest. They are terrified. The village elders say the gods of the forest demand four villagers as sacrifice to stay safe.",
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
          const knowledge = state.stats.knowledge || 0;
          const successChance = 0.3 + knowledge;
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
            const disappearances = Math.floor(Math.random() * 3) + 1;
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
        const departures = Math.floor(Math.random() * 4) + 2;
        const deathResult = killVillagers(state, departures);

        return {
          ...deathResult,
          _logMessage: `Your indecision angers the villagers. ${departures} villagers, frustrated with your lack of leadership during this crisis, pack their belongings and leave the village in disgust.`,
        };
      },
    },
  },

  wizardFrostglassSword: {
    id: "wizardFrostglassSword",
    condition: (state: GameState) =>
      state.story.seen.hillGraveSuccess &&
      state.resources.frostglas >= 50 &&
      state.buildings.blacksmith >= 1 &&
      state.buildings.grandBlacksmith === 0 &&
      !state.story.seen.wizardFrostglassSword,
    triggerType: "resource",
    timeProbability: 1.0,
    message:
      "The wizard summons you to his tower. 'You have found the frostglas we need,' he declares, 'but your current blacksmith lacks the tools to forge it properly. We need build a better blacksmith. Only then can we create the Frostglass Sword needed to defeat the darkness below.'",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardFrostglassSword: true,
        },
      },
    }),
  },

  madBeduine: {
    id: "madBeduine",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 6 &&
      state.current_population > 8 &&
      !state.relics.unnamed_book,
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
          const villagerDeaths = Math.floor(
            Math.random() * state.buildings.woodenHut,
          );
          const hutDestruction = Math.floor(Math.random() * 2) + 1;

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
    condition: (state: GameState) => state.flags.forestUnlocked, // && !state.relics.cracked_crown,
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
        relevant_stats: ["strength"],
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

          if (rand < successChance + luck * 0.01) {
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

  wizardArrives: {
    id: "wizardArrives",
    condition: (state: GameState) =>
      state.buildings.sanctum >= 1 &&
      state.buildings.bastion >= 1 &&
      !state.story.seen.wizardArrives,
    triggerType: "resource",
    timeProbability: 1.0,
    message:
      "An old man with a long grey beard, draped in a weathered grey coat, approaches your settlement. His eyes gleam with ancient wisdom and power. 'I am a wizard,' he declares in a voice that echoes with arcane authority. 'Build me a tower, and I shall aid you with powers beyond mortal ken.'",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardArrives: true,
        },
      },
    }),
  },

  wizardDecryptsScrolls: {
    id: "wizardDecryptsScrolls",
    condition: (state: GameState) =>
      state.relics.ancient_scrolls &&
      state.buildings.wizardTower >= 1 &&
      !state.story.seen.wizardDecryptsScrolls,
    triggerType: "resource",
    timeProbability: 2,
    message:
      "The wizard emerges from his tower, his eyes blazing with newfound knowledge. 'I have decrypted the ancient scrolls. The creature in the depths can only be defeated with weapons of extraordinary power - a sword forged from frostglas, and a staff crowned with a bloodstone. Without these, we will not stand a chance against the ancient evil below.'",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => ({
      relics: {
        ...state.relics,
        frostfang: true,
        blood_scepter: true,
      },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardDecryptsScrolls: true,
        },
      },
    }),
  },

  templeDedication: {
    id: "templeDedication",
    condition: (state: GameState) =>
      state.buildings.temple >= 1 && !state.story.seen.templeDedicated,
    triggerType: "time",
    timeProbability: 1.0,
    title: "The Blind Druid",
    message:
      "A few days after the temple is built, a blind druid who lives in the forest appears at your gates. His milky eyes seem to see through your soul as he speaks: 'The temple must be dedicated to a religion. Choose wisely, for this choice will shape your community's destiny forever.'",
    triggered: false,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "church_of_dagon",
        label: "Church of Dagon",
        effect: (state: GameState) => {
          return {
            blessings: {
              ...state.blessings,
              dagons_gift: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                templeDedicated: true,
                templeDedicatedTo: "dagon",
              },
            },
            _logMessage:
              "You dedicate the temple to Dagon, the ancient and mysterious god of the deep.",
          };
        },
      },
      {
        id: "way_of_first_flame",
        label: "Way of the First Flame",
        effect: (state: GameState) => {
          const currentPop = Object.values(state.villagers).reduce(
            (sum, count) => sum + (count || 0),
            0,
          );
          const maxPop = getMaxPopulation(state);
          const canAdd = Math.min(4, maxPop - currentPop);

          return {
            villagers: {
              ...state.villagers,
              free: (state.villagers.free || 0) + canAdd,
            },
            blessings: {
              ...state.blessings,
              flames_touch: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                templeDedicated: true,
                templeDedicatedTo: "flame",
              },
            },
            _logMessage:
              "You dedicate the temple to the Way of the First Flame, an ancient path of fire and rebirth.",
          };
        },
      },
      {
        id: "cult_of_ravenborn",
        label: "Cult of the Ravenborn",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              ravens_orb: true,
            },
            blessings: {
              ...state.blessings,
              ravens_mark: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                templeDedicated: true,
                templeDedicatedTo: "raven",
              },
            },
            _logMessage:
              "You dedicate the temple to the Cult of the Ravenborn, an enigmatic and shadowed order.",
          };
        },
      },
      {
        id: "order_of_ashbringer",
        label: "Order of the Ashbringer",
        effect: (state: GameState) => {
          return {
            weapons: {
              ...state.weapons,
              ashen_dagger: true,
            },
            blessings: {
              ...state.blessings,
              ashen_embrace: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                templeDedicated: true,
                templeDedicatedTo: "ash",
              },
            },
            _logMessage:
              "You dedicate the temple to the Order of the Ashbringer, a solemn and fire-bound brotherhood.",
          };
        },
      },
    ],
  },

  wizardHillGrave: {
    id: "wizardHillGrave",
    condition: (state: GameState) =>
      state.story.seen.wizardDecryptsScrolls &&
      !state.story.seen.wizardHillGrave,
    triggerType: "resource",
    timeProbability: 2,
    title: "The Hill Grave",
    message:
      "The wizard summons you to his tower with urgency. 'I have found something in ancient texts,' he says, his eyes gleaming. 'Deep in the forest lies a hill grave, burial site of an old king from forgotten times. Among his treasures may some frostglas - the very material we need. But beware - the grave is protected by deadly traps laid by those who buried him.'",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardHillGrave: true,
        },
      },
    }),
  },

  vikingBuilder: {
    id: "vikingBuilder",
    condition: (state: GameState) =>
      state.buildings.palisades >= 2 && !state.story.seen.vikingBuilderEvent,
    triggerType: "resource",
    timeProbability: 25,
    title: "The Viking Builder",
    message:
      "One day, a strong man wearing thick furs stands at the gates and asks to enter. He says he comes from the far north and is a skilled builder. For a little gold, he will teach you how to build big houses that can hold many villagers.",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "acceptDeal",
        label: "Accept Deal (250 gold)",
        effect: (state: GameState) => {
          if (state.resources.gold < 250) {
            return {
              _logMessage: "You don't have enough gold for this deal.",
            };
          }

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 250,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                vikingBuilderEvent: true,
                longhouseUnlocked: true,
              },
            },
            _logMessage:
              "You pay the builder his fee. He teaches your villagers the ancient Nordic techniques for constructing longhouses - great halls that can shelter multiple families under one roof.",
          };
        },
      },
      {
        id: "sendAway",
        label: "Send him away",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You refuse the builder's offer and send him away. He shrugs and disappears into the wilderness, taking his knowledge with him.",
          };
        },
      },
      {
        id: "forceHim",
        label: "Force him to teach you",
        relevant_stats: ["strength"],
        effect: (state: GameState) => {
          const strength = getTotalStrength(state);
          const successChance = 0.3 + strength * 0.01; // 30% base + 1% per strength point

          if (Math.random() < successChance) {
            // Success: get knowledge without paying
            return {
              _logMessage:
                "Your men overpower the builder and force him to share his knowledge. Reluctantly, he teaches you the secrets of longhouse construction before escaping into the night.",
            };
          } else {
            // Failure: he escapes and villagers are injured
            const casualties = Math.floor(Math.random() * 5) + 1;
            const deathResult = killVillagers(state, casualties);

            return {
              ...deathResult,
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  vikingBuilderEvent: true,
                },
              },
              _logMessage: `The builder proves stronger than expected! He fights back fiercely, injuring ${casualties} of your men before escaping into the wilderness. Your attempt to steal his knowledge has failed, and you've gained nothing but wounded villagers.`,
            };
          }
        },
      },
    ],
  },
};
