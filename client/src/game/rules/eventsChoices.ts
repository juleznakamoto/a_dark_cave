import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getTotalStrength } from "./effectsCalculation";
import { getMaxPopulation } from "@/game/population";
import { woodcutterEvents } from "./eventsWoodcutter";
import { loreEvents } from "./eventsLore";
import { shopItemEvents } from "./eventsShopItems";
import { fullGameUnlockEvents } from "./eventsFullGameUnlock";

export const choiceEvents: Record<string, GameEvent> = {
  ...woodcutterEvents,
  ...loreEvents,
  ...shopItemEvents,
  ...fullGameUnlockEvents,
  paleFigure: {
    id: "paleFigure",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 2 &&
      !state.clothing.ravenfeather_mantle &&
      state.current_population >= 4,
    
    timeProbability: 35,
    title: "The Pale Figure",
    message:
      "At dawn, villagers glimpse a tall, pale, slender figure at the woods’ edge. What do you do?",
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "investigate",
        label: "Investigate",
        relevant_stats: ["luck", "strength"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(
            state,
            0.1,
            { type: "strength", multiplier: 0.01 },
            { type: "luck", multiplier: 0.005 },
          );
        },
        effect: (state: GameState) => {
          const mantleChance = calculateSuccessChance(
            state,
            0.1,
            { type: "strength", multiplier: 0.01 },
            { type: "luck", multiplier: 0.005 },
          );

          const rand = Math.random();
          if (rand < mantleChance) {
            return {
              clothing: {
                ...state.clothing,
                ravenfeather_mantle: true,
              },
              _logMessage:
                "As the vilalgers near, the figure vanishes. In its place lies a raven-feather mantle, shimmering with otherworldly power.",
            };
          } else if (rand < 0.6) {
            return {
              ...killVillagers(state, 1),
              _logMessage:
                "The investigation goes wrong. One man screams in the mist and is never seen again. The others flee in terror.",
            };
          } else {
            let deaths;
            deaths = 2 + Math.floor(Math.random() * state.buildings.woodenHut * 0.5) + state.CM * 2

            const deathResult = killVillagers(state, deaths);
            const actualDeaths = deathResult.villagersKilled || 0;

            return {
              ...deathResult,
              _logMessage: `The pale figure moves with inhuman speed. ${actualDeaths} villagers vanish into the mist, their screams echoing through the trees.`,
            };
          }
        },
      },
      {
        id: "ignore",
        label: "Ignore it",
        relevant_stats: ["luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(
            state,
            0.4,
            { type: "luck", multiplier: 0.01 },
          );
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(
            state,
            0.4,
            { type: "luck", multiplier: 0.01 },
          );
          const rand = Math.random();
          if (rand < successChance) {
            // Nothing happens
            return {
              _logMessage:
                "The villagers stay close to the village. By evening, the figure is gone.",
            };
          } else {
            // 1 man found dead
            return {
              ...killVillagers(state, 1),
              _logMessage:
                "At dawn, one of the villagers who claimed to have seen the figure is found dead in his bed, his face frozen in terror.",
            };
          }
        },
      },
    ],
  },

  whispersBeneathHut: {
    id: "whispersBeneathHut",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 4 && !state.clothing.muttering_amulet,
    
    timeProbability: 25,
    title: "Whispers Beneath the Hut",
    message:
      "At night, faint whispers seem to rise from under the floor of one of the huts. The villagers are uneasy. Do you investigate?",
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "investigateHut",
        label: "Investigate",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
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
    
    timeProbability: 35,
    title: "The Blackened Mirror",
    message:
      "A wandering tradesman offers a tall, cracked mirror framed in black iron. It radiates a cold, unnatural aura. He claims it can give glimpses of the future.",
    priority: 3,
    repeatable: false,
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
    
    timeProbability: 45,
    title: "A Strange Wooden Figure",
    message:
      "At the forest's edge a small wooden figure is found, carved with tentacled features. It emanates a strange aura. Do you keep it?",
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

  offerToTheForestGods: {
    id: "offerToTheForestGods",
    condition: (state: GameState) =>
      state.current_population >= 10 &&
      !state.clothing.ebony_ring &&
      state.buildings.altar == 1,
    
    timeProbability: 35,
    title: "Offer to the Forest Gods",
    message:
      "While hunting, villagers report unsettling figures in the forest. They are terrified. Village elders say the forest gods demand four villagers as sacrifice.",
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "sacrifice",
        label: (state: GameState) => `Sacrifice ${state.CM ? 8 : 4} villagers`,
        relevant_stats: ["knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.3, {
            type: "knowledge",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.3, {
            type: "knowledge",
            multiplier: 0.01,
          });
          const rand = Math.random();

          // Kill 4 villagers first
          const deathResult = killVillagers(state, 4 + state.CM * 4);

          if (rand < successChance) {
            // Success: event resolved, get ebony ring
            return {
              ...deathResult,
              clothing: {
                ...state.clothing,
                ebony_ring: true,
              },
              _logMessage:
                "The forest gods accept the sacrifice. The figures vanish, and an ebony ring is found on the altar where the villagers were offered. Peace returns to the woods.",
            };
          } else {
            // Failure: additional suicides
            const additionalDeaths =
              Math.floor(Math.random() * 5) + 2 + state.CM * 2; // 2-6 additional deaths
            const totalDeathResult = killVillagers(
              {
                ...state,
                villagers: deathResult.villagers || state.villagers,
              },
              additionalDeaths,
            );
            const actualAdditionalDeaths = totalDeathResult.villagersKilled || 0;

            return {
              villagers: totalDeathResult.villagers,
              clothing: {
                ...state.clothing,
                ebony_ring: true,
              },
              _logMessage: `The forest accepts the sacrifice. The figures vanish, and an ebony ring is found on the altar where the villagers were offered. But the horror of the sacrifice drives ${actualAdditionalDeaths} villagers to take their own lives.`,
            };
          }
        },
      },
      {
        id: "refuse",
        label: "Make no sacrifices",
        relevant_stats: ["luck"],
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(
            state,
            0.1,
            { type: "luck", multiplier: 0.01 },
            undefined,
            -0.025,
          );
          const nothingChance = 0.4 - state.CM * 0.05;
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
            const disappearances =
              Math.floor(Math.random() * 3) + 1 + state.CM * 2;
            const deathResult = killVillagers(state, disappearances);
            const actualDisappearances = deathResult.villagersKilled || 0;

            return {
              ...deathResult,
              _logMessage: `You refuse the sacrifice. During the night, ${actualDisappearances} villager${actualDisappearances > 1 ? "s" : ""} wander${actualDisappearances === 1 ? "s" : ""} into the woods as if sleepwalking, drawn by a voice only they could hear. They are never seen again.`,
            };
          }
        },
      },
    ],
    fallbackChoice: {
      id: "noDecision",
      label: "No Decision Made",
      effect: (state: GameState) => {
        const departures = Math.floor(Math.random() * 4) + 2 + state.CM * 2;
        const deathResult = killVillagers(state, departures);
        const actualDepartures = deathResult.villagersKilled || 0;

        return {
          ...deathResult,
          _logMessage: `Your indecision angers the villagers. ${actualDepartures} villagers, frustrated with your lack of leadership, pack their belongings and leave the village in disgust.`,
        };
      },
    },
  },

  madBeduine: {
    id: "madBeduine",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 7 &&
      state.current_population > 12 &&
      !state.relics.unnamed_book,
    
    timeProbability: 35,
    title: "The Mad Beduine",
    message:
      "In the evening, a robed figure approaches from the wilderness. His eyes burn with madness as he mutters in a foreign tongue, gestures sharp and unsettling. The villagers grow uneasy. Do you allow this Beduine to stay the night?",
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
          const traps = state.buildings.traps;
          const villagerDeaths = Math.floor(
            Math.random() * state.buildings.woodenHut +
              2 -
              traps * 2 +
              state.CM * 2,
          );
          const hutDestruction = state.CM * 1;

          const deathResult = killVillagers(state, villagerDeaths);
          const actualDeaths = deathResult.villagersKilled || 0;

          return {
            ...deathResult,
            buildings: {
              ...state.buildings,
              woodenHut: Math.max(
                0,
                state.buildings.woodenHut - hutDestruction,
              ),
            },
            _logMessage: `You refuse the stranger entry. He leaves screaming curses in his alien tongue, echoing through the night. Before dawn, a barbarian tribe attacks as if summoned by his cries, killing ${actualDeaths} villagers ${hutDestruction > 0 ? " and destroying one wooden hut " : ""}before vanishing into the wilds.`,
          };
        },
      },
    ],
  },

  hiddenLake: {
    id: "hiddenLake",
    condition: (state: GameState) =>
      state.flags.forestUnlocked &&
      state.buildings.woodenHut >= 4 &&
      !state.clothing.cracked_crown,
    
    timeProbability: 40,
    title: "The Hidden Lake",
    message:
      "While gathering wood in the forest, the villagers discover a lake hidden among trees. One villager swears he saw a woman-like figure surface briefly, her gaze beautiful yet inhuman. What do you do?",
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "investigate",
        label: "Investigate lake",
        relevant_stats: ["strength"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.2, {
            type: "strength",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.2, {
            type: "strength",
            multiplier: 0.01,
          });
          const fleeChance = 0.2 - state.CM * 0.05;
          const rand = Math.random();

          if (rand < successChance) {
            return {
              clothing: {
                ...state.clothing,
                cracked_crown: true,
              },
              _logMessage:
                "As the men approach the lake a creature emerges from the depths and strikes with fury, but the villagers' strength prevails. At the bottom of the lake they find countless human bones and a golden crown.",
            };
          } else if (rand < successChance + fleeChance) {
            return {
              _logMessage:
                "The men wade into the waters, but the creature bursts forth with inhuman speed. Her beauty twists into rows of teeth and glowing eyes. Terrified, the villagers flee to save their lives.",
            };
          } else {
            const drownedCount =
              Math.floor(Math.random() * 4) + 1 + state.CM * 2;
            const deathResult = killVillagers(state, drownedCount);
            const actualDrowned = deathResult.villagersKilled || 0;

            return {
              ...deathResult,
              _logMessage: `The creature rises like a nightmare, beauty masking deadly intent. With unnatural strength, she drags ${actualDrowned} villager${actualDrowned > 1 ? "s" : ""} beneath the waters. Only ripples and faint screams remain as the rest flee in terror.`,
            };
          }
        },
      },
      {
        id: "avoidLake",
        label: "Avoid lake",
        relevant_stats: ["luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.4, {
            type: "luck",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.4, {
            type: "luck",
            multiplier: 0.01,
          });
          const rand = Math.random();

          if (rand < successChance) {
            return {
              _logMessage:
                "You order the villagers to avoid the lake. Some grumble about lost opportunities, but they obey. Its secrets remain hidden beneath the water.",
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
    
    timeProbability: 1,
    title: "The Blind Druid returns",
    message:
      "Shortly after the temple is built, the blind druid appears. His milky eyes seem to see through your soul as he speaks: 'The temple must be dedicated to a god. Choose wisely.'",
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
      state.buildings.stoneHut >= 9 && !state.story.seen.vikingBuilderEvent,
    
    timeProbability: 15,
    title: "The Viking Builder",
    message:
      "One day, a strong man wearing thick furs stands at the gates. He says he comes from the far north and is a skilled builder. For a little gold, he will teach you how to build big houses that can hold many villagers.",
    priority: 4,
    repeatable: true,
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
              "You pay the builder. He teaches the villagers the ancient nordic techniques for constructing longhouses.",
          };
        },
      },
      {
        id: "forceHim",
        label: "Force him",
        relevant_stats: ["strength"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.2, {
            type: "strength",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.2, {
            type: "strength",
            multiplier: 0.01,
          });

          if (Math.random() < successChance) {
            // Success: get knowledge without paying
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  vikingBuilderEvent: true,
                  vikingBuilderEventForced: true,
                  longhouseUnlocked: true,
                },
              },
              _logMessage:
                "Your men overpower the builder and force him to share his knowledge. Reluctantly, he teaches you the secrets of longhouse construction.",
            };
          } else {
            // Failure: he escapes and villagers are killed
            const casualties = Math.floor(Math.random() * 5) + 1 + state.CM * 3;
            const deathResult = killVillagers(state, casualties);
            const actualCasualties = deathResult.villagersKilled || 0;

            return {
              ...deathResult,
              _logMessage: `The builder proves stronger than expected! He fights back fiercely, killing ${actualCasualties} men before escaping into the wilderness.`,
            };
          }
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
    ],
  },

  nordicWarAxe: {
    id: "nordicWarAxe",
    condition: (state: GameState) =>
      state.buildings.longhouse >= 2 &&
      state.cruelMode &&
      !state.weapons.nordic_war_axe &&
      !state.story.seen.nordicWarAxeEvent,
    
    timeProbability: 15,
    title: "The Viking Returns",
    message:
      "The viking builder returns to your village, carrying a magnificent war axe. 'I forged this Nordic War Axe in my homeland. It shall be yours... for a price.'",
    priority: 5,
    repeatable: true,
    choices: [
      {
        id: "buyAxe",
        label: (state: GameState) => {
          const cost = state.story.seen.vikingBuilderEventForced ? 750 : 500;
          return `Buy for ${cost} gold`;
        },
        cost: (state: GameState) => {
          const cost = state.story.seen.vikingBuilderEventForced ? 750 : 500;
          return `${cost} gold`;
        },
        effect: (state: GameState) => {
          const cost = state.story.seen.vikingBuilderEventForced ? 750 : 500;

          if (state.resources.gold < cost) {
            return {
              _logMessage: "You don't have enough gold.",
            };
          }

          const wasForced = state.story.seen.vikingBuilderEventForced;
          const message = wasForced
            ? `The viking takes the payment with a cold smile. 'Perhaps you should have been more generous before, instead of attacking me. You would have paid much less for the axe then.' he speaks before leaving.`
            : `Happy with the trade the viking nods approvingly and departs.`;

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - cost,
            },
            weapons: {
              ...state.weapons,
              nordic_war_axe: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                nordicWarAxeEvent: true,
              },
            },
            _logMessage: message,
          };
        },
      },
      {
        id: "decline",
        label: "Decline",
        effect: (state: GameState) => {
          const wasForced = state.story.seen.vikingBuilderEventForced;
          const message = wasForced
            ? "You decline the offer. The viking spits on the ground, muttering curses as he leaves with his war axe. 'You should have paid me when you had the chance,' he growls."
            : "You decline the offer. The viking nods respectfully and leaves with his war axe.";

          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                nordicWarAxeEvent: true,
              },
            },
            _logMessage: message,
          };
        },
      },
    ],
  },

  wanderingTribe: {
    id: "wanderingTribe",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 4 &&
      state.resources.fur >= 2500 &&
      !state.buildings.furTents,
    
    timeProbability: 30,
    title: "The Wandering Tribe",
    message:
      "A small tribe of nomads approaches the village. Their leader speaks: 'We have traveled far and seek a place to call home. Help us help build fur tents to shelter our people and we will join your community.'",
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptTribe",
        label: "Help them",
        cost: "2500 fur",
        effect: (state: GameState) => {
          if (state.resources.fur < 2500) {
            return {
              _logMessage: "You don't have enough fur to help them.",
            };
          }

          const currentPop = Object.values(state.villagers).reduce(
            (sum, count) => sum + (count || 0),
            0,
          );
          const maxPop = getMaxPopulation(state);
          const canAdd = Math.min(10, maxPop + 10 - currentPop);

          return {
            resources: {
              ...state.resources,
              fur: state.resources.fur - 2500,
            },
            buildings: {
              ...state.buildings,
              furTents: (state.buildings.furTents || 0) + 1,
            },
            villagers: {
              ...state.villagers,
              free: (state.villagers.free || 0) + canAdd,
            },
            _logMessage:
              "The tribe gratefully accepts your help. They set up their fur tents and join your community.",
          };
        },
      },
      {
        id: "refuseTribe",
        label: "Refuse",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You decline their offer. The tribe leader nods respectfully and continues their journey into the wilderness.",
          };
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
    
    timeProbability: 3,
    title: "The Dedication of the Sanctum",
    message:
      "The blind druid emerges: 'The Sanctum stands complete,' he says, his voice carrying the weight of ancient wisdom. 'Now you must choose: deepen your devotion to the path you have chosen, or embrace all gods and their gifts. Choose wisely.'",
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
        state.buildings.woodenHut >= 3 &&
        currentPopulation > 2 &&
        hasRoomForTwo &&
        !state.story.seen.slaveTraderEvent
      );
    },
    
    timeProbability: 25,
    title: "The Slave Trader",
    message:
      "A man on a cart drawn by two horses approaches the village. An iron cage on the cart holds two miserable souls. The trader grins wickedly: 'I'll pay you 100 steel for two of your villagers. What do you say?'",
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
              "You hand over two of the villagers. The trader tosses you a bag of steel and rides off with his new captives. When the remaining villagers see what you've done,  they abandon the village in disgust.",
          };
        },
      },
      {
        id: "freeSlaves",
        label: "Try to free slaves",
        relevant_stats: ["strength"],
        success_chance: (state: GameState) => {
          const strength = getTotalStrength(state);
          return 0.5 + 0.01 * strength - state.CM * 0.1;
        },
        effect: (state: GameState) => {
          const strength = getTotalStrength(state);
          const successChance = 0.5 + strength * 0.01 - state.CM * 0.1;

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
            const deaths = Math.floor(Math.random() * 2) + 1 + state.CM * 1;
            const deathResult = killVillagers(state, deaths);
            const actualDeaths = deathResult.villagersKilled || 0;

            return {
              ...deathResult,
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  slaveTraderEvent: true,
                },
              },
              _logMessage: `Your men attack the slaver, but he's prepared! He fights back viciously. ${actualDeaths} of the villagers ${actualDeaths === 1 ? "falls" : "fall"} in the struggle. The trader escapes with his captives, leaving only death behind.`,
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

  witchsCurse: {
    id: "witchsCurse",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 8 &&
      state.resources.gold >= 50 &&
      !state.curseState?.isActive &&
      !state.story.seen.witchsCurseEvent,
    
    timeProbability: 45,
    title: "The Witch's Curse",
    message:
      "A hunched old woman in tattered robes arrives at the gates. With malice in her voice she demands, 'Pay me 50 gold, or I shall curse you with misfortune.'",
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "payGold",
        label: "Pay gold",
        cost: "50 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 50) {
            return {
              _logMessage: "You don't have enough gold to pay her.",
            };
          }

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 50,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                witchsCurseEvent: true,
              },
            },
            _logMessage:
              "You hand over the gold. The witch cackles, pockets the coins, and disappears into the mist without another word.",
          };
        },
      },
      {
        id: "doNotPay",
        label: "Refuse to pay",
        relevant_stats: ["luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.25, {
            type: "luck",
            multiplier: 0.015,
          });
        },
        effect: (state: GameState) => {
          const avoidCurseChance = calculateSuccessChance(state, 0.25, {
            type: "luck",
            multiplier: 0.015,
          });

          if (Math.random() < avoidCurseChance) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  witchsCurseEvent: true,
                },
              },
              _logMessage:
                "You refuse to pay. The witch spits and curses, but nothing happens. She hobbles away, muttering threats into the wind. It seems you got lucky.",
            };
          } else {
            const curseDuration = (10 + 5 * state.CM) * 60 * 1000; // 10/15 minutes
            return {
              curseState: {
                isActive: true,
                endTime: Date.now() + curseDuration,
              },
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  witchsCurseEvent: true,
                },
              },
              _logMessage:
                "As you refuse to pay the witch raises her gnarled hands and speaks words in a forgotten tongue. When she leaves the villagers start to feel weak, as if their strength was sapped by an unseen force.",
            };
          }
        },
      },
      {
        id: "attackHer",
        label: "Attack witch",
        relevant_stats: ["strength"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.15, {
            type: "strength",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.15, {
            type: "strength",
            multiplier: 0.01,
          });

          if (Math.random() < successChance) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  witchsCurseEvent: true,
                },
              },
              _logMessage:
                "The villagers strike her down before she can finish her curse. Before the witch falls her body dissolves into black smoke, leaving only a foul stench.",
            };
          } else {
            const curseDuration = (10 + 5 * state.CM) * 60 * 1000; // 10/15 minutes
            return {
              curseState: {
                isActive: true,
                endTime: Date.now() + curseDuration,
              },
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  witchsCurseEvent: true,
                },
              },
              _logMessage:
                "The men attack, but the witch is too quick. With a final cackle, she curses the village before vanishing into the woods. An intense weakness falls over your people, sapping their strength and will.",
            };
          }
        },
      },
      {
        id: "threatenHer",
        label: "Threaten witch",
        relevant_stats: ["knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.2, {
            type: "knowledge",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.2, {
            type: "knowledge",
            multiplier: 0.01,
          });

          if (Math.random() < successChance) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  witchsCurseEvent: true,
                },
              },
              _logMessage:
                "You speak ancient words of power, learned from old texts. The witch recoils in fear and flees, her curse broken before it could take hold.",
            };
          } else {
            const curseDuration = (10 + 5 * state.CM) * 60 * 1000; // 10/15 minutes
            return {
              curseState: {
                isActive: true,
                endTime: Date.now() + curseDuration,
              },
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  witchsCurseEvent: true,
                },
              },
              _logMessage:
                "Your threats only anger the witch. She laughs and curses your village with dark magic. When she leaves the villagers start to feel weak, as if their strength was sapped by an unseen force.",
            };
          }
        },
      },
    ],
  },

  masterArcher: {
    id: "masterArcher",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 5 && !state.blessings.sharp_aim,
    
    timeProbability: 30,
    title: "The Master Archer",
    message:
      "A man in a dark red leather coat arrives with a confident grin and sharp eyes. He offers to help your archers, saying he can sharpen their aim and improve their hunting skills. If you accept, he'll stay and get to work.",
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptArcherHelp",
        label: "Give food",
        cost: "2500 food",
        effect: (state: GameState) => {
          if (state.resources.food < 2500) {
            return {};
          }

          const result = {
            resources: {
              ...state.resources,
              food: Math.max(0, state.resources.food - 2500),
            },
            blessings: {
              ...state.blessings,
              sharp_aim: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                masterArcherEvent: true,
              },
            },
            _logMessage:
              "The master archer takes the payment and begins training your hunters immediately.",
          };

          console.log("[MASTER ARCHER] Effect returning:", {
            currentBlessings: state.blessings,
            resultBlessings: result.blessings,
            hasSharpAim: result.blessings.sharp_aim,
          });

          return result;
        },
      },
      {
        id: "acceptArcherHelpGold",
        label: "Pay gold",
        cost: "100 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 100) {
            return {};
          }

          const result = {
            resources: {
              ...state.resources,
              gold: Math.max(0, state.resources.gold - 100),
            },
            blessings: {
              ...state.blessings,
              sharp_aim: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                masterArcherEvent: true,
              },
            },
            _logMessage:
              "The master archer takes the gold with a nod and begins training your hunters immediately.",
          };

          console.log("[MASTER ARCHER] Effect returning:", {
            currentBlessings: state.blessings,
            resultBlessings: result.blessings,
            hasSharpAim: result.blessings.sharp_aim,
          });

          return result;
        },
      },
      {
        id: "refuseArcherHelp",
        label: "Refuse his offer",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "The archer nods understandingly. 'I'll return in case you change your mind,' he says before disappearing into the forest.",
          };
        },
      },
    ],
  },

  mysteriousWoman: {
    id: "mysteriousWoman",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 3 &&
      state.resources.silver >= 200 + state.CM * 100 &&
      !state.story.seen.mysteriousWomanEvent,
    
    timeProbability: 5,
    title: "The Mysterious Woman",
    message:
      "An attractive young woman in fine clothes arrives at the village as the sun sets. She smiles warmly at you and asks, 'Might I have shelter in your hut for the night? I've traveled far and have nowhere else to go.'",
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "allowStay",
        label: "Let her stay",
        effect: (state: GameState) => {
          // She steals silver
          const silverStolen = 200 + state.CM * 100;
          return {
            resources: {
              ...state.resources,
              silver: Math.max(0, state.resources.silver - silverStolen),
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                mysteriousWomanEvent: true,
              },
            },
            _logMessage: `You grant her shelter for the night. By morning, she has vanished without a trace, leaving your bed still warm and ${silverStolen} silver missing.`,
          };
        },
      },
      {
        id: "refuseStay",
        label: "Refuse her",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                mysteriousWomanEvent: true,
              },
            },
            _logMessage:
              "You politely refuse her request. She looks disappointed but nods in understanding, disappearing into the evening mist without another word.",
          };
        },
      },
    ],
  },

  unnamedWanderer: {
    id: "unnamedWanderer",
    condition: (state: GameState) =>
      state.buildings.deepPit >= 1 &&
      !state.miningBoostState?.isActive &&
      !state.story.seen.unnamedWandererAccepted,
    
    timeProbability: 60,
    title: "The Unnamed Wanderer",
    message:
      "A man in torn clothes approaches the village, his hands marked from years of hard labor. 'I come from a mining colony,' he says in a rough voice. 'I can work for you to improve your mining yield.'",
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "offerFood",
        label: "Offer food",
        cost: "2500 food",
        effect: (state: GameState) => {
          if (state.resources.food < 2500) {
            return {
              _logMessage: "You don't have enough food to offer.",
            };
          }

          const boostDuration = 30 * 60 * 1000; // 30 minutes
          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 2500,
            },
            miningBoostState: {
              isActive: true,
              endTime: Date.now() + boostDuration,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                unnamedWandererAccepted: true,
              },
            },
            _logMessage:
              "The wanderer gives a brief nod and walks off to the mining pit to begin his labor.",
          };
        },
      },
      {
        id: "offerGold",
        label: "Offer gold",
        cost: "50 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 50) {
            return {
              _logMessage: "You don't have enough gold to offer.",
            };
          }

          const boostDuration = 30 * 60 * 1000; // 30 minutes
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 50,
            },
            miningBoostState: {
              isActive: true,
              endTime: Date.now() + boostDuration,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                unnamedWandererAccepted: true,
              },
            },
            _logMessage:
              "The wanderer gives a brief nod and walks off to the mining pit to begin his labor.",
          };
        },
      },
      {
        id: "sendAway",
        label: "Send away",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You decline the wanderer's offer. He shrugs, adjusts his worn pack, and disappears down the road.",
          };
        },
      },
    ],
  },

  wanderingFirecrafter: {
    id: "wanderingFirecrafter",
    condition: (state: GameState) =>
      state.cruelMode &&
      state.story.seen.firstWaveVictory &&
      state.buildings.alchemistHall >= 1 &&
      state.story.seen.alchemistArrives &&
      !state.story.seen.wanderingFirecrafterEvent,
    
    timeProbability: 20,
    title: "The Wandering Firecrafter",
    message:
      "A hooded figure in stained robes arrives at your village. 'I am a firecrafter,' he says with an echoing voice. 'I can teach you to craft a bomb of extreme power, that tears reality itself. But knowledge has its price.'",
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "payGold",
        label: "Pay gold",
        cost: "250 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 250) {
            return {
              _logMessage: "You don't have enough gold.",
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
                wanderingFirecrafterEvent: true,
                canCraftVoidBomb: true,
              },
            },
            _logMessage:
              "The firecrafter takes your gold and begins teaching you the dark art of void bomb creation. 'Use this power wisely,' he warns before vanishing into the shadows.",
          };
        },
      },
      {
        id: "paySilver",
        label: "Pay silver",
        cost: "1000 silver",
        effect: (state: GameState) => {
          if (state.resources.silver < 1000) {
            return {
              _logMessage: "You don't have enough silver.",
            };
          }

          return {
            resources: {
              ...state.resources,
              silver: state.resources.silver - 1000,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                wanderingFirecrafterEvent: true,
                canCraftVoidBomb: true,
              },
            },
            _logMessage:
              "The firecrafter takes your silver and begins teaching you the dark art of void bomb creation. 'Use this power wisely,' he warns before vanishing into the shadows.",
          };
        },
      },
      {
        id: "sendAway",
        label: "Send away",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                wanderingFirecrafterEvent: true,
              },
            },
            _logMessage:
              "You refuse the firecrafter's offer. He nods knowingly, 'Perhaps you are not ready for such power yet,' and disappears into the night.",
          };
        },
      },
    ],
  },

  boneTempleProposal: {
    id: "boneTempleProposal",
    condition: (state: GameState) =>
      (state.story?.seen?.humansSacrificeLevel || 0) >= 10 &&
      !state.story?.seen?.boneTempleProposalEvent &&
      state.buildings.blackMonolith >= 1 &&
      (state.buildings.boneTemple || 0) === 0,
    
    timeProbability: 1,
    title: "The Elder's Demand",
    message:
      "An elder woman with clouded eyes approaches you, 'We must end the spillng of human blood,' she declares. 'The old gods demand a great monument in their honor. Only then will the gods grant us their continued favor.'",
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "acceptBoneTemple",
        label: "Accept proposal",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                boneTempleProposalEvent: true,
                boneTempleUnlocked: true,
              },
            },
            _logMessage:
              "You accept the elder's wisdom. The villagers nod in silent approval. The path to building the ultimate monument to the gods now lies open.",
          };
        },
      },
    ],
  },

  youngWomanProtest: {
    id: "youngWomanProtest",
    condition: (state: GameState) =>
      (state.story?.seen?.humansSacrificeLevel || 0) >= 5 &&
      !state.story?.seen?.youngWomanProtestEvent,
    
    timeProbability: 2,
    title: "The Young Woman's Plea",
    message:
      "A young woman approaches you with tears streaming down her face. 'Both my parents were sacrificed to that cursed monolith,' she cries. 'This barbaric behavior has to stop!'",
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "banishHer",
        label: "Banish her",
        effect: (state: GameState) => {
          const deathResult = killVillagers(state, 10 + 5 * state.CM);
          const actualLeavers = deathResult.villagersKilled || 0;
          return {
            ...deathResult,
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                youngWomanProtestEvent: true,
              },
            },
            _logMessage: `You banish the young woman from the village. She convinces ${actualLeavers} sympathetic villagers to leave with her, abandoning your settlement forever.`,
          };
        },
      },
      {
        id: "sacrificeHer",
        label: "Sacrifice her",
        effect: (state: GameState) => {
          const deathResult = killVillagers(state, 21 + 10 * state.CM); // 1 for her + 20/30 who leave
          const actualLeavers = deathResult.villagersKilled || 0;
          return {
            ...deathResult,
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                youngWomanProtestEvent: true,
              },
            },
            _logMessage: `Shortly after the sacrifice is carried out at the Black Monolith, ${actualLeavers} horrified villagers pack their belongings and flee the village in disgust.`,
          };
        },
      },
      {
        id: "stopSacrifices",
        label: "Stop human sacrifices",
        effect: (state: GameState) => {
          return {
            flags: {
              ...state.flags,
              humanSacrificeUnlocked: false,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                youngWomanProtestEvent: true,
                pillarOfClarityUnlocked: true,
              },
            },
            _logMessage:
              "You agree to end the practice of human sacrifice. The woman proposes destroying the Black Monolith and building a pure white obelisk in its place cleansing the darkness from the people's minds.",
          };
        },
      },
    ],
  },

  frostfall: {
    id: "frostfall",
    condition: (state: GameState) => {
      const timesOccurred = state.story?.seen?.frostfallCount || 0;
      return (
        state.buildings.woodenHut >= 3 &&
        !state.frostfallState?.isActive &&
        timesOccurred < 5
      );
    },
    
    timeProbability: 90, // 1.5 hours
    title: "Frostfall",
    message:
      "Icy winds howl through the village. The elders warn that a terrible blizzard is approaching. Preparations must be made, or the consequences will be dire.",
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "prepareFrostfall",
        label: "Prepare",
        cost: (state: GameState) => {
          const timesOccurred = state.story?.seen?.frostfallCount || 0;
          const woodCost = 1000 * (timesOccurred + 1);
          const foodCost = 1000 * (timesOccurred + 1);
          return `${woodCost} wood, ${foodCost} food`;
        },
        effect: (state: GameState) => {
          const timesOccurred = state.story?.seen?.frostfallCount || 0;
          const woodCost = 1000 * (timesOccurred + 1);
          const foodCost = 1000 * (timesOccurred + 1);

          if (
            state.resources.wood < woodCost ||
            state.resources.food < foodCost
          ) {
            return {
              _logMessage: "You don't have enough resources to prepare.",
            };
          }

          return {
            resources: {
              ...state.resources,
              wood: state.resources.wood - woodCost,
              food: state.resources.food - foodCost,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                frostfallCount: timesOccurred + 1,
              },
            },
            _logMessage:
              "Thanks to the stockpiles of firewood and food, the villagers survive the blizzard unharmed.",
          };
        },
      },
      {
        id: "doNothing",
        label: "Do nothing",
        effect: (state: GameState) => {
          const timesOccurred = state.story?.seen?.frostfallCount || 0;
          const frostfallDuration = (10 + 5 * state.CM) * 60 * 1000; // 10/15 minutes

          return {
            frostfallState: {
              isActive: true,
              endTime: Date.now() + frostfallDuration,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                frostfallCount: timesOccurred + 1,
              },
            },
            _logMessage:
              "The blizzard hits with brutal force. All production slows to a crawl as villagers struggle to survive the cold.",
          };
        },
      },
    ],
  },
};