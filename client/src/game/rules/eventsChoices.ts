import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import {
  getTotalStrength,
  getTotalLuck,
  getTotalKnowledge,
} from "./effectsCalculation";
import { getMaxPopulation } from "@/game/population";

export const choiceEvents: Record<string, GameEvent> = {
  paleFigure: {
    id: "paleFigure",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 2 &&
      !state.clothing.ravenfeather_mantle &&
      state.current_population >= 4,
    triggerType: "resource",
    timeProbability: 35,
    title: "The Pale Figure",
    message: [
      "At dawn, men glimpse a tall, pale, slender figure at the woods’ edge. What do you do?",
      "In the grey morning, a tall, pale, slender figure stands at the treeline. What do you do?",
      "Villagers report of a tall, pale, slender figure in the mist near the forest's edge. What do you do?",
    ][Math.floor(Math.random() * 3)],
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "investigate",
        label: "Investigate",
        relevant_stats: ["luck", "strength"],
        effect: (state: GameState) => {
          const strength = getTotalStrength(state);
          const luck = getTotalLuck(state);
          // Base 10% chance + 1 % per strength 0.5 % per luck
          const mantleChance = 0.1 + strength + luck * 0.005;

          const rand = Math.random();
          if (rand < mantleChance) {
            return {
              relics: {
                ...state.relics,
                ravenfeather_mantle: true,
              },
              _logMessage:
                "As your men near, the pale figure vanishes. In its place lies a raven-feather mantle, shimmering with otherworldly power.",
            };
          } else if (rand < 0.6) {
            return {
              ...killVillagers(state, 1),
              _logMessage:
                "The investigation goes wrong. One man screams in the mist and is never seen again. The others flee in terror.",
            };
          } else {
            const deaths = Math.min(
              4,
              2 + Math.floor(Math.random() * state.buildings.woodenHut),
            );
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
                "The men stay close to the village. By evening, the figure is gone.",
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
      state.buildings.woodenHut >= 4 && !state.relics.muttering_amulet,
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
        label: "Investigate",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              muttering_amulet: true,
            },
            _logMessage:
              "You lift the floorboards and find a strange amulet, faintly whispering.",
          };
        },
      },
      {
        id: "ignoreHut",
        label: "Ignore",
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
        label: "Buy for 500 iron",
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
              "You purchase the mirror. Its dark surface gives glimpses of your own future, nudging your sanity toward the edge.",
          };
        },
      },
      {
        id: "refuseMirror",
        label: "Refuse",
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
      state.buildings.woodenHut >= 4 &&
      !state.relics.wooden_figure &&
      !state.story.seen.cthulhuFigureChoice,
    triggerType: "resource",
    timeProbability: 45,
    title: "A Strange Wooden Figure",
    message:
      "At the forest's edge a small wooden figure is found, carved with tentacled features. It emanates a strange aura. Do you keep it?",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "keepFigure",
        label: "Keep it",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              wooden_figure: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                cthulhuFigureChoice: true,
              },
            },
            _logMessage:
              "You decide to keep the figure. Its strange aura makes the villagers uneasy.",
          };
        },
      },
      {
        id: "discardFigure",
        label: "Discard it",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                cthulhuFigureChoice: true,
              },
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
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 3 && !state.relics.alphas_hide,
    triggerType: "resource",
    timeProbability: 35,
    title: "Wolf Attack",
    message:
      "Close to midnight, wolves emerge from the darkness, their eyes glowing with unnatural hunger. Their howls echo filled with malice as they circle your village.",
    triggered: false,
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "defendVillage",
        label: "Defend village",
        relevant_stats: ["strength"],
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

          // Check for victory: 15% base chance + 1% per strength point
          const victoryChance = 0.15 + strength * 0.01;

          if (Math.random() < victoryChance) {
            // Victory! Get Alpha's Hide
            return {
              clothing: {
                ...state.clothing,
                alphas_hide: true,
              },
              _logMessage:
                "The village defeats the wolf pack! You slay the alpha wolf and claim its hide as a trophy. It radiates with primal power.",
            };
          }

          // Base chance of casualties (70%), reduced by 2% per strength point, minimum 20%
          const casualtyChance = Math.max(0.2, 0.6 - strength * 0.02);

          let villagerDeaths = 0;
          let foodLoss = Math.min(
            state.resources.food,
            (state.buildings.woodenHut + Math.floor(Math.random() * 8)) * 25,
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
          if (villagerDeaths >= 2 && state.buildings.woodenHut > 0) {
            if (Math.random() < 0.5) {
              hutDestroyed = true;
            }
          }

          // Apply deaths to villagers
          const deathResult = killVillagers(state, villagerDeaths);

          // Construct result message
          let message = "The village fights desperately against the wolves. ";

          if (villagerDeaths === 0) {
            message += "The villagers survive the attack.";
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
              " In their rampage, the wolves destroy one of your huts, leaving only splintered wood.";
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
        label: "Hide",
        relevant_stats: ["luck"],
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

          const luck = getTotalLuck(state);
          const casualtyChance = Math.max(0.1, 0.4 - luck * 0.02);

          let villagerDeaths = 0;
          let foodLoss = Math.min(
            state.resources.food,
            (state.buildings.woodenHut + Math.floor(Math.random() * 16)) * 25,
          );
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
            "The villagers huddle in their huts as the wolves prowl outside. ";

          if (villagerDeaths === 0) {
            message +=
              "By dawn, the wolves have departed, leaving only scratches and terror behind.";
          } else if (villagerDeaths === 1) {
            message +=
              "One villager who ventured out is found torn apart at sunrise.";
          } else {
            message += `${villagerDeaths} villagers are dragged from their huts, their screams echoing through the night.`;
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

  offerToTheForestGods: {
    id: "offerToTheForestGods",
    condition: (state: GameState) =>
      state.current_population > 10 &&
      !state.relics.ebony_ring &&
      state.buildings.altar == 1,
    triggerType: "resource",
    timeProbability: 30,
    title: "Offer to the Forest Gods",
    message:
      "While hunting, villagers report unsettling figures in the forest. They are terrified. Village elders say the forest gods demand four villagers as sacrifice.",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "sacrifice",
        label: "Sacrifice 4 villagers",
        relevant_stats: ["knowledge"],
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const successChance = 0.3 + knowledge;
          const rand = Math.random();

          // Kill 4 villagers first
          const deathResult = killVillagers(state, 4);

          if (rand < successChance) {
            // Success: event resolved, get ebony ring
            return {
              ...deathResult,
              clothing: {
                ...state.clothing,
                ebony_ring: true,
              },
              _logMessage:
                "The forest gods accept your sacrifice. The figures vanish, and an ebony ring is found on the altar where the villagers were offered. Peace returns to the woods.",
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
              clothing: {
                ...state.clothing,
                ebony_ring: true,
              },
              _logMessage: `The forest accepts your sacrifice. The figures vanish, and an ebony ring is found on the altar where the villagers were offered. But the horror of the sacrifice drives ${additionalDeaths} villagers to take their own lives.`,
            };
          }
        },
      },
      {
        id: "refuse",
        label: "Make no sacrifices",
        effect: (state: GameState) => {
          const successChance = 0.1;
          const nothingChance = 0.4;
          const rand = Math.random();

          if (rand < successChance) {
            // Best outcome: event resolved, get ebony ring
            return {
              clothing: {
                ...state.clothing,
                ebony_ring: true,
              },
              _logMessage:
                "Your refusal to sacrifice innocent lives somehow pleases the forest gods. The appearances vanish, and you find an ebony ring left as a gift.",
            };
          } else if (rand < successChance + nothingChance) {
            // Nothing happens, event remains active
            return {
              _logMessage:
                "You refuse the sacrifice. The forest remains silent for now. The threat lingers.",
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
          _logMessage: `Your indecision angers the villagers. ${departures} villagers, frustrated with your lack of leadership, pack their belongings and leave the village in disgust.`,
        };
      },
    },
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
      "In the evening, a robed figure approaches from the wilderness. His eyes burn with madness as he mutters in a foreign tongue, gestures sharp and unsettling. The villagers grow uneasy. Do you allow this Beduine to stay the night?",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "allowStay",
        label: "Allow to stay",
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
        label: "Turn away",
        effect: (state: GameState) => {
          const villagerDeaths = Math.floor(
            Math.random() * state.buildings.woodenHut + 1,
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
            _logMessage: `You refuse the stranger entry. He leaves screaming curses in his alien tongue, echoing through the night. Before dawn, a cannibal tribe attacks as if summoned by his cries, killing ${villagerDeaths} villagers and destroying ${hutDestruction} hut${hutDestruction > 1 ? "s" : ""} before vanishing into the wilds.`,
          };
        },
      },
    ],
  },

  hiddenLake: {
    id: "hiddenLake",
    condition: (state: GameState) => state.flags.forestUnlocked,
    triggerType: "resource",
    timeProbability: 35,
    title: "The Hidden Lake",
    message:
      "While gathering wood in the forest, your villagers discover a lake hidden among trees. One villager swears he saw a woman-like figure surface briefly, her gaze beautiful yet inhuman. What do you do?",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "investigate",
        label: "Investigate lake",
        relevant_stats: ["strength"],
        effect: (state: GameState) => {
          const strength = state.stats.strength || 0;
          const successChance = 0.25 + strength * 0.01; // 25% + 1% per strength point
          const fleeChance = 0.2;
          const rand = Math.random();

          if (rand < successChance) {
            return {
              relics: {
                ...state.clothing,
                cracked_crown: true,
              },
              _logMessage:
                "As the men approach the lake a creature emerges from the depths and strikes with fury, but your villagers' strength prevails. At the bottom of the lake they find countless human bones and a golden crown.",
            };
          } else if (rand < successChance + fleeChance) {
            return {
              _logMessage:
                "Your men wade into the waters, but the creature bursts forth with inhuman speed. Her beauty twists into rows of teeth and glowing eyes. Terrified, your villagers flee to save their lives.",
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
        label: "Avoid lake",
        relevant_stats: ["luck"],
        effect: (state: GameState) => {
          const successChance = 0.2;
          const luck = state.stats.luck || 0;
          const rand = Math.random();

          if (rand < successChance + luck * 0.01) {
            return {
              _logMessage:
                "You order your villagers to avoid the lake. Some grumble about lost opportunities, but they obey. Its secrets remain hidden beneath the water.",
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

  templeDedication: {
    id: "templeDedication",
    condition: (state: GameState) =>
      state.buildings.temple >= 1 && !state.story.seen.templeDedicated,
    triggerType: "time",
    timeProbability: 1,
    title: "The Blind Druid",
    message:
      "Shortly after the temple is built, the blind druid appears at the temple. His milky eyes seem to see through your soul as he speaks: 'The temple must be dedicated to a god. Choose wisely.'",
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
              },
            },
            _logMessage:
              "You dedicate the temple to Dagon, an ancient and mysterious god of the deep.",
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
              },
            },
            _logMessage:
              "You dedicate the temple to the Order of the Ashbringer, a solemn and fire-bound brotherhood.",
          };
        },
      },
    ],
  },

  vikingBuilder: {
    id: "vikingBuilder",
    condition: (state: GameState) =>
      state.buildings.palisades >= 1 &&
      !state.story.seen.vikingBuilderEvent &&
      state.resources.gold >= 250,
    triggerType: "resource",
    timeProbability: 15,
    title: "The Viking Builder",
    message:
      "One day, a strong man wearing thick furs stands at the gates. He says he comes from the far north and is a skilled builder. For a little gold, he will teach you how to build big houses that can hold many villagers.",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "acceptDeal",
        label: "Pay him 250 Gold",
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
              "You pay the builder. He teaches your villagers the ancient nordic techniques for constructing longhouses.",
          };
        },
      },
      {
        id: "sendAway",
        label: "Send away",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You refuse the builder's offer and send him away. He shrugs and disappears into the wilderness, taking his knowledge with him.",
          };
        },
      },
      {
        id: "forceHim",
        label: "Force him",
        relevant_stats: ["strength"],
        effect: (state: GameState) => {
          const strength = getTotalStrength(state);
          const successChance = 0.3 + strength * 0.01; // 30% base + 1% per strength point

          if (Math.random() < successChance) {
            // Success: get knowledge without paying
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  vikingBuilderEvent: true,
                  longhouseUnlocked: true,
                },
              },
              _logMessage:
                "Your men overpower the builder and force him to share his knowledge. Reluctantly, he teaches you the secrets of longhouse construction.",
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
              _logMessage: `The builder proves stronger than expected! He fights back fiercely, killing ${casualties} of your men before escaping into the wilderness.`,
            };
          }
        },
      },
    ],
  },

  sanctumDedication: {
    id: "sanctumDedication",
    condition: (state: GameState) =>
      state.buildings.sanctum >= 1 &&
      state.buildings.bastion >= 1 &&
      state.story.seen.templeDedicated &&
      !state.story.seen.sanctumDedicated,
    triggerType: "resource",
    timeProbability: 3,
    title: "The Druid Returns",
    message:
      "The blind druid emerges: 'The Sanctum stands complete,' he says, his voice carrying the weight of ancient wisdom. 'Now you must choose: deepen your devotion to the path you have chosen, or embrace all gods and their gifts. Choose wisely.'",
    triggered: false,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "deepenDevotion",
        label: "Deepen Devotion",
        effect: (state: GameState) => {
          const b = state.blessings;
          const active = b.dagons_gift
            ? "dagon"
            : b.flames_touch
              ? "flame"
              : b.ravens_mark
                ? "raven"
                : b.ashen_embrace
                  ? "ash"
                  : "";

          const updates: Record<string, any> = {
            dagon: {
              dagons_gift: true,
              dagons_gift_enhanced: true,
              msg: "Dagon's Blessing flows stronger than before.",
            },
            flame: {
              flames_touch: true,
              flames_touch_enhanced: true,
              msg: "The First Flame burns brighter than before.",
            },
            raven: {
              ravens_mark: true,
              ravens_mark_enhanced: true,
              msg: "The Raven's Mark grows stronger than before.",
            },
            ash: {
              ashen_embrace: true,
              ashen_embrace_enhanced: true,
              msg: "The Ashen Embrace is stronger than before.",
            },
          };

          const { msg, ...blessings } = updates[active] || { msg: "" };

          return {
            blessings: { ...state.blessings, ...blessings },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                sanctumDedicated: true,
              },
            },
            templeDedicatedTo: active || state.templeDedicatedTo,
            _logMessage: msg,
          };
        },
      },
      {
        id: "dedicateToAll",
        label: "Dedicate to all",
        effect: (state: GameState) => {
          return {
            blessings: {
              ...state.blessings,
              dagons_gift: true,
              flames_touch: true,
              ravens_mark: true,
              ashen_embrace: true,
            },
            relics: {
              ...state.relics,
              ravens_orb: true,
            },
            weapons: {
              ...state.weapons,
              ashen_dagger: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                sanctumDedicated: true,
              },
            },
            templeDedicatedTo: "all",
            _logMessage:
              "The Sanctum transforms into a nexus of divine power. All gods answer your call, their gifts are yours.",
          };
        },
      },
    ],
  },

  slaveTrader: {
    id: "slaveTrader",
    condition: (state: GameState) => {
      const currentPopulation = Object.values(state.villagers).reduce(
        (sum, count) => sum + (count || 0),
        0,
      );
      const maxPopulation = getMaxPopulation(state);
      const hasRoomForTwo = maxPopulation - currentPopulation >= 2;

      return (
        state.buildings.woodenHut >= 2 &&
        currentPopulation > 2 &&
        hasRoomForTwo &&
        !state.story.seen.slaveTraderEvent
      );
    },
    triggerType: "resource",
    timeProbability: 10,
    title: "The Slave Trader",
    message:
      "A man on a cart drawn by two horses approaches the village. An iron cage on the cart holds two miserable souls. The trader grins wickedly: 'I'll pay you 100 steel for two of your villagers. What do you say?'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "sellVillagers",
        label: "Sell 2 villagers",
        effect: (state: GameState) => {
          const currentPopulation = Object.values(state.villagers).reduce(
            (sum, count) => sum + (count || 0),
            0,
          );

          // Kill 2 villagers for the trade
          const tradeResult = killVillagers(state, 2);

          // All remaining villagers leave in disgust
          const remainingPopulation = currentPopulation - 2;
          const leaveResult = killVillagers(
            { ...state, villagers: tradeResult.villagers || state.villagers },
            remainingPopulation,
          );

          return {
            ...leaveResult,
            resources: {
              ...state.resources,
              steel: state.resources.steel + 100,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                slaveTraderEvent: true,
              },
            },
            _logMessage:
              "You hand over two of your villagers. The trader tosses you a bag of steel and rides off with his new captives. When the remaining villagers see what you've done,  they abandon the village in disgust.",
          };
        },
      },
      {
        id: "freeSlaves",
        label: "Try freeing the slaves",
        relevant_stats: ["strength"],
        effect: (state: GameState) => {
          const strength = getTotalStrength(state);
          const successChance = 0.5 + strength * 0.01;

          if (Math.random() < successChance) {
            // Success: free the captives and take the steel
            const currentPopulation = Object.values(state.villagers).reduce(
              (sum, count) => sum + (count || 0),
              0,
            );
            const maxPopulation = getMaxPopulation(state);
            const villagersToAdd = Math.min(
              2,
              maxPopulation - currentPopulation,
            );

            return {
              villagers: {
                ...state.villagers,
                free: state.villagers.free + villagersToAdd,
              },
              resources: {
                ...state.resources,
                steel: state.resources.steel + 100,
              },
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  slaveTraderEvent: true,
                },
              },
              _logMessage:
                "Your men attack the slaver! The fight is brutal but victorious. You free the captives and claim the trader's steel. The freed souls join your village.",
            };
          } else {
            // Failure: 1-2 villagers die
            const deaths = Math.floor(Math.random() * 2) + 1;
            const deathResult = killVillagers(state, deaths);

            return {
              ...deathResult,
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  slaveTraderEvent: true,
                },
              },
              _logMessage: `Your men attack the slaver, but he's prepared! He fights back viciously. ${deaths} of your villagers ${deaths === 1 ? "falls" : "fall"} in the struggle. The trader escapes with his captives, leaving only death behind.`,
            };
          }
        },
      },
      {
        id: "refuseTrader",
        label: "Refuse the offer",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                slaveTraderEvent: true,
              },
            },
            _logMessage:
              "You refuse the slaver's vile offer. He spits on the ground in disgust and rides away with his captives.",
          };
        },
      },
    ],
  },

  woodcutter1: {
    id: "woodcutter1",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 2 &&
      state.buildings.woodenHut <= 6 &&
      !state.story.seen.woodcutterBetrayed &&
      !state.story.seen.woodcutter1Accepted,
    triggerType: "resource",
    timeProbability: 5,
    title: "The Woodcutter",
    message:
      "A muscular man with a large axe approaches your village. He flexes his arms 'I can cut trees like no other,' he boasts. 'Give me food, and I'll bring wood.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptServices",
        label: "Pay 25 food",
        cost: "25 food",
        effect: (state: GameState) => {
          if (state.resources.food < 25) {
            return {};
          }

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 25,
              wood: state.resources.wood + 100,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutterMet: true,
                woodcutter1Met: true,
                woodcutter1Accepted: true,
              },
            },
            _logMessage:
              "The woodcutter takes the food and heads into the forest. By evening, he returns with the promised 100 wood stacked neatly at your village edge.",
          };
        },
      },
      {
        id: "denyServices",
        label: "Deny services",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You decline his offer. The woodcutter shrugs and walks away into the forest.",
          };
        },
      },
    ],
  },

  woodcutter2: {
    id: "woodcutter2",
    condition: (state: GameState) =>
      state.story.seen.woodcutter1Met &&
      !state.story.seen.woodcutterBetrayed &&
      !state.story.seen.woodcutter2Accepted &&
      state.buildings.woodenHut >= 2 &&
      state.buildings.woodenHut <= 7,
    triggerType: "time",
    timeProbability: 5,
    title: "The Woodcutter Returns",
    message:
      "The woodcutter returns, his axe gleaming in the sun. 'Your village grows well,' he observes. 'I can bring you more wood. What do you say?'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptServices",
        label: "Pay 50 food",
        cost: "50 food",
        effect: (state: GameState) => {
          if (state.resources.food < 50) {
            return {
              _logMessage: "You don't have enough food for this deal.",
            };
          }

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 50,
              wood: state.resources.wood + 250,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutter2Met: true,
                woodcutter2Accepted: true,
              },
            },
            _logMessage:
              "The woodcutter takes the food and disappears into the forest. By nightfall, he returns with a large pile of 250 wood.",
          };
        },
      },
      {
        id: "denyServices",
        label: "Deny services",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You decline his offer. The woodcutter nods and departs without complaint.",
          };
        },
      },
    ],
  },

  woodcutter3: {
    id: "woodcutter3",
    condition: (state: GameState) =>
      state.story.seen.woodcutter2Met &&
      !state.story.seen.woodcutterBetrayed &&
      !state.story.seen.woodcutter3Accepted &&
      state.buildings.woodenHut >= 3 &&
      state.buildings.woodenHut <= 8,
    triggerType: "time",
    timeProbability: 5,
    title: "The Woodcutter's Offer",
    message:
      "The woodcutter approaches again 'I see your village continues to thrive,' he says with a grin. 'I can bring you more wood if you pay for it.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptServices",
        label: "Pay 100 food",
        cost: "100 food",
        effect: (state: GameState) => {
          if (state.resources.food < 100) {
            return {
              _logMessage: "You don't have enough food for this deal.",
            };
          }

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 100,
              wood: state.resources.wood + 750,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutter3Met: true,
                woodcutter3Accepted: true,
              },
            },
            _logMessage:
              "The woodcutter takes the food and ventures deep into the forest. He returns with an impressive haul of 750 wood.",
          };
        },
      },
      {
        id: "denyServices",
        label: "Deny services",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You turn down his offer. He shrugs and walks back into the woods.",
          };
        },
      },
    ],
  },

  woodcutter4: {
    id: "woodcutter4",
    condition: (state: GameState) =>
      state.story.seen.woodcutter3Met &&
      !state.story.seen.woodcutterBetrayed &&
      !state.story.seen.woodcutter4Accepted &&
      state.buildings.woodenHut >= 4 &&
      state.buildings.woodenHut <= 9,
    triggerType: "time",
    timeProbability: 5,
    title: "The Woodcutter's Ambitious Plan",
    message:
      "The woodcutter arrives once more, 'Do you want to use my services once more?,' he asks.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptServices",
        label: "Pay 150 food",
        cost: "150 food",
        effect: (state: GameState) => {
          if (state.resources.food < 150) {
            return {
              _logMessage: "You don't have enough food for this deal.",
            };
          }

          const betrayalChance = 0.3333; // 33.33%
          const isBetrayedNow = Math.random() < betrayalChance;

          if (isBetrayedNow) {
            return {
              resources: {
                ...state.resources,
                food: state.resources.food - 150,
              },
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  woodcutterBetrayed: true,
                },
              },
              _logMessage:
                "You hand over the food, but days pass with no sign of the woodcutter. It seems you got betrayed.",
            };
          }

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 150,
              wood: state.resources.wood + 1500,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutter4Met: true,
                woodcutter4Accepted: true,
              },
            },
            _logMessage:
              "The woodcutter takes the food and spends the afternoon in the forest. He returns with an enormous pile of 1500 wood.",
          };
        },
      },
      {
        id: "denyServices",
        label: "Deny services",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You decline his ambitious offer. The woodcutter looks disappointed but accepts your decision.",
          };
        },
      },
    ],
  },

  woodcutter5: {
    id: "woodcutter5",
    condition: (state: GameState) =>
      state.story.seen.woodcutter4Met &&
      !state.story.seen.woodcutterBetrayed &&
      !state.story.seen.woodcutter5Accepted &&
      state.buildings.woodenHut >= 5 &&
      state.buildings.woodenHut <= 10,
    triggerType: "time",
    timeProbability: 5,
    title: "The Woodcutter's Grand Proposal",
    message:
      "The woodcutter appears with a confident smile. 'How about we make one more deal?'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptServices",
        label: "Pay 200 food",
        cost: "200 food",
        effect: (state: GameState) => {
          if (state.resources.food < 200) {
            return {
              _logMessage: "You don't have enough food for this deal.",
            };
          }

          const betrayalChance = 0.5; // 50%
          const isBetrayedNow = Math.random() < betrayalChance;

          if (isBetrayedNow) {
            return {
              resources: {
                ...state.resources,
                food: state.resources.food - 200,
              },
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  woodcutterBetrayed: true,
                },
              },
              _logMessage:
                "You hand over the food. The woodcutter promises to return the same day. But he never does. It seems you got betrayed.",
            };
          }

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 200,
              wood: state.resources.wood + 2500,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutter5Met: true,
                woodcutter5Accepted: true,
              },
            },
            _logMessage:
              "The woodcutter takes the food and within the same day he delivers a massive stockpile of 2500 wood to your village.",
          };
        },
      },
      {
        id: "denyServices",
        label: "Deny services",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You refuse the deal. The woodcutter frowns but doesn't argue.",
          };
        },
      },
    ],
  },

  woodcutter6: {
    id: "woodcutter6",
    condition: (state: GameState) =>
      state.story.seen.woodcutter5Met &&
      !state.story.seen.woodcutterBetrayed &&
      !state.story.seen.woodcutter6Accepted &&
      state.buildings.woodenHut >= 6 &&
      state.buildings.woodenHut <= 10,
    triggerType: "time",
    timeProbability: 5,
    title: "The Woodcutter's Offer",
    message:
      "The woodcutter returns to the village, 'Do you want to trade food for wood once more?' he asks.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptServices",
        label: "Pay 250 food",
        cost: "250 food",
        effect: (state: GameState) => {
          if (state.resources.food < 250) {
            return {
              _logMessage: "You don't have enough food for this deal.",
            };
          }

          // 100% betrayal
          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 250,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutterBetrayed: true,
                woodcutter6Accepted: true,
              },
            },
            _logMessage:
              "You hand over the food. The woodcutter grins as he leaves towards the forest. You wait, but he never returns. It seems you got betrayed.",
          };
        },
      },
      {
        id: "denyServices",
        label: "Deny services",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutterEnded: true,
              },
            },
            _logMessage:
              "Something about his demeanor makes you uneasy. You refuse the deal. The woodcutter's smile fades, and he leaves without a word.",
          };
        },
      },
    ],
  },
};
