import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";
import { addFreeVillagersWithinCap, killVillagers } from "@/game/stateHelpers";
import { getTotalMadness, getTotalLuck } from "./effectsCalculation";
import { getCurrentPopulation, getMaxPopulation } from "../population";
import { CRUEL_MODE, cruelModeScale } from "../cruelMode";

const withCruelMadnessBonus = (state: GameState, baseMadnessGain: number): number =>
  baseMadnessGain +
  (state.cruelMode ? CRUEL_MODE.madnessFromEvents.flatBonusWhenCruel : 0);

export const madnessEvents: Record<string, GameEvent> = {
  whisperingVoices: {
    id: "whisperingVoices",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 10 && !state.events.whisperingVoices,
    timeProbability: 30,
    title: "Whispering Voices",
    message:
      "You hear faint whispers in the wind, speaking words in no language you recognize, but somehow you understand them. They speak of ancient things buried beneath the earth. The voices grow clearer until in the evening they are suddenly gone.",
    priority: 2,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        whisperingVoices: true,
      },
      stats: {
        ...state.stats,
        madnessFromEvents:
          (state.stats.madnessFromEvents || 0) +
          withCruelMadnessBonus(state, 1),
      },
    }),
  },

  shadowsMove: {
    id: "shadowsMove",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 15 && !state.events.shadowsMove,
    timeProbability: 30,
    message:
      "The shadows in the village seem to move wrong. They stretch too long, twist at impossible angles, and sometimes seem to move independently of their sources. You catch glimpses of shapes that shouldn't be there.",
    priority: 1,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        shadowsMove: true,
      },
      stats: {
        ...state.stats,
        madnessFromEvents:
          (state.stats.madnessFromEvents || 0) +
          withCruelMadnessBonus(state, 2),
      },
    }),
  },

  villagerStares: {
    id: "villagerStares",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 20 &&
      state.villagers.free > 0 &&
      !state.events.villagerStares,
    timeProbability: 30,
    title: "Hollow Stares",
    message:
      "One of the villagers has begun staring at nothing for hours. When you approach, their eyes are completely black. They smile when they notice you watching.",
    priority: 3,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "confront",
        label: "Confront villager",
        relevant_stats: ["knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.01,
          });

          if (Math.random() < successChance) {
            return {
              events: {
                ...state.events,
                villagerStares: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 2),
              },
              _logMessage:
                "You confront the villager. They turn to you with that black-eyed smile and whisper something that makes your mind reel. The words echo in your head for days.",
            };
          } else {
            const deathResult = killVillagers(state, 1);
            return {
              ...deathResult,
              events: {
                ...state.events,
                villagerStares: true,
              },
              stats: {
                ...state.stats,
                ...(deathResult.stats || {}),
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 3),
              },
              _logMessage:
                "As you approach, the villager's smile widens impossibly. They collapse, black fluid pouring from their eyes and mouth. You realize they've been dead for hours.",
            };
          }
        },
      },
      {
        id: "avoid",
        label: "Avoid villager",
        effect: (state: GameState) => {
          const deathResult = killVillagers(state, 1);
          return {
            ...deathResult,
            events: {
              ...state.events,
              villagerStares: true,
            },
            stats: {
              ...state.stats,
              ...(deathResult.stats || {}),
              madnessFromEvents:
                (state.stats.madnessFromEvents || 0) +
                withCruelMadnessBonus(state, 2),
            },
            _logMessage:
              "You avoid the villager, but you feel their hollow gaze following you wherever you go. Sleep becomes difficult. After a few nights, the villager is found dead in his bed, his clothes soaked through with a black, reeking slime.",
          };
        },
      },
    ],
  },

  bloodInWater: {
    id: "bloodInWater",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 25 && !state.events.bloodInWater,
    timeProbability: 30,
    message:
      "The village water runs red for three days. The villagers don't seem to notice, drinking it as if nothing has changed. You taste copper and iron, but they claim it tastes like the sweetest spring water.",
    priority: 2,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        bloodInWater: true,
      },
      stats: {
        ...state.stats,
        madnessFromEvents:
          (state.stats.madnessFromEvents || 0) +
          withCruelMadnessBonus(state, 2),
      },
    }),
  },

  facesInWalls: {
    id: "facesInWalls",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 27 && !state.events.facesInWalls,

    timeProbability: 30,
    title: "Faces in the Walls",
    message:
      "The wooden walls of your huts have begun showing faces - twisted, agonized expressions that seem to push through from the other side. They mouth silent screams and pleas. The villagers step around them as if they've always been there.",
    priority: 3,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "examine",
        label: "Examine faces",
        relevant_stats: ["knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.0, {
            type: "knowledge",
            multiplier: 0.0075,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.0, {
            type: "knowledge",
            multiplier: 0.0075,
          });

          if (Math.random() < successChance) {
            return {
              events: {
                ...state.events,
                facesInWalls: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 1),
              },
              _logMessage:
                "Upon closer inspection, it seems to have been merely an optical illusion. You breathe a sigh of relief.",
            };
          } else {
            return {
              events: {
                ...state.events,
                facesInWalls: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 5),
              },
              _logMessage:
                "You lean close to one of the faces. Its eyes snap open and it whispers your name. You recognize the face as someone who died long time ago.",
            };
          }
        },
      },
      {
        id: "ignore",
        label: "Ignore them",
        effect: (state: GameState) => ({
          events: {
            ...state.events,
            facesInWalls: true,
          },
          stats: {
            ...state.stats,
            madnessFromEvents:
              (state.stats.madnessFromEvents || 0) +
              withCruelMadnessBonus(state, 3),
          },
          _logMessage:
            "You try to ignore the faces, but they multiply. Soon every wooden surface in the village bears the mark of tortured souls. One morning they are all gone, as they were never there.",
        }),
      },
    ],
  },

  wrongVillagers: {
    id: "wrongVillagers",
    condition: (state: GameState) => {
      const currentPopulation = getCurrentPopulation(state);
      const maxPopulation = getMaxPopulation(state);
      const spaceForThree = currentPopulation + 3 <= maxPopulation;

      return (
        getTotalMadness(state) >= 30 &&
        state.villagers.free > 2 &&
        spaceForThree &&
        !state.events.wrongVillagers
      );
    },
    timeProbability: 30,
    message:
      "You count the villagers and there are three more than there should be. The extra ones look exactly like villagers who died months ago. They work, eat, and sleep normally, but their eyes hold depths of ancient malice.",
    priority: 2,
    repeatable: false,
    effect: (state: GameState) => {
      const { patch } = addFreeVillagersWithinCap(state, 3);

      return {
        ...patch,
        events: {
          ...state.events,
          wrongVillagers: true,
        },
        stats: {
          ...state.stats,
          madnessFromEvents:
            (state.stats.madnessFromEvents || 0) +
            withCruelMadnessBonus(state, 2),
        },
      };
    },
  },

  skinCrawling: {
    id: "skinCrawling",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 35 && !state.events.skinCrawling,
    timeProbability: 30,
    title: "Crawling Skin",
    message:
      "Your skin begins to crawl - literally. You can see shapes moving beneath the surface, seamingly creating patterns. The villagers watch you scratch bloody furrows in your arms with expressions of great worry.",
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "calm_down",
        label: "Try to calm down",
        relevant_stats: ["knowledge", "luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.0, {
            type: "knowledge",
            multiplier: 0.005,
          }, {
            type: "luck",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.0, {
            type: "knowledge",
            multiplier: 0.005,
          }, {
            type: "luck",
            multiplier: 0.01,
          });

          if (Math.random() < successChance) {
            return {
              events: {
                ...state.events,
                skinCrawling: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
              },
              _logMessage:
                "You take deep breaths and force yourself to remain still. The crawling sensation gradually fades, and your skin returns to normal. You have conquered this horror through sheer willpower.",
            };
          } else {
            return {
              events: {
                ...state.events,
                skinCrawling: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 2),
              },
              _logMessage:
                "You try to calm yourself, but the sensation intensifies. Your vision blurs and you collapse. In your fevered dreams, ancient things whisper your true name. When you awaken, the crawling has stopped, but the memory lingers.",
            };
          }
        },
      },
      {
        id: "keep_scratching",
        label: "Keep scratching",
        effect: (state: GameState) => {
          const killedVillagers = 5 + cruelModeScale(state) * 3;
          const deathResult = killVillagers(state, killedVillagers);
          return {
            ...deathResult,
            events: {
              ...state.events,
              skinCrawling: true,
            },
            stats: {
              ...state.stats,
              ...(deathResult.stats || {}),
              madnessFromEvents:
                (state.stats.madnessFromEvents || 0) +
                withCruelMadnessBonus(state, 2),
            },
            _logMessage: `You claw frantically at your skin, drawing blood. The villagers rush to stop you, grabbing your arms. In your maddened rage, you lash out violently, killing ${killedVillagers} villagers before collapsing from exhaustion. When you awaken, the crawling has stopped, but blood stains your hands.`,
          };
        },
      },
    ],
  },

  creatureInHut: {
    id: "creatureInHut",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 35 &&
      state.buildings.woodenHut > 0 &&
      !state.events.creatureInHut,
    timeProbability: 30,
    title: "Something in the Hut",
    message:
      "Through the cracks in one of your wooden huts, you glimpse something that shouldn't be there. A dark shape moves in the darkness, too tall and too thin to be human. As it turns toward you, you see eyes gleaming like dying stars.",
    priority: 3,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "burn_hut",
        label: "Burn hut",
        relevant_stats: ["luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.1, {
            type: "luck",
            multiplier: 0.015,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.1, {
            type: "luck",
            multiplier: 0.015,
          });

          if (Math.random() < successChance) {
            return {
              events: {
                ...state.events,
                creatureInHut: true,
              },
              resources: {
                ...state.resources,
                gold: (state.resources.gold || 0) + 250,
              },
              buildings: {
                ...state.buildings,
                woodenHut: Math.max(0, state.buildings.woodenHut - 1),
              },
              stats: {
                ...state.stats,
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 0),
              },
              _logMessage:
                "You set the hut ablaze. The flames consume the creature. Searching the ruins afterward, you find a small chest hidden beneath the floorboards containing 250 Gold.",
            };
          } else {
            const deathResult = killVillagers(state, 2);
            return {
              ...deathResult,
              events: {
                ...state.events,
                creatureInHut: true,
              },
              buildings: {
                ...state.buildings,
                woodenHut: Math.max(0, state.buildings.woodenHut - 1),
              },
              stats: {
                ...state.stats,
                ...(deathResult.stats || {}),
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 3),
              },
              _logMessage:
                "You set the hut ablaze. The flames consume everything, including the two villagers sleeping inside. In the morning, you find only ash and the lingering smell of something that was never meant to burn.",
            };
          }
        },
      },
      {
        id: "do_nothing",
        label: "Do nothing",
        effect: (state: GameState) => ({
          events: {
            ...state.events,
            creatureInHut: true,
          },
          stats: {
            ...state.stats,
            madnessFromEvents:
              (state.stats.madnessFromEvents || 0) +
              withCruelMadnessBonus(state, 3),
          },
          _logMessage:
            "You turn away and try to forget what you saw. But in your dreams, the creature visits you. It whispers your name with a voice like grinding stone, and shows you visions of what lies beneath the earth.",
        }),
      },
    ],
  },

  wrongReflections: {
    id: "wrongReflections",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 40 && !state.events.wrongReflections,
    timeProbability: 30,
    title: "Wrong Reflections",
    message:
      "The surface of the village well shows reflections that don't match reality. You see yourself, but older, with hollow eyes and a mouth full of darkness.",
    priority: 2,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "investigate",
        label: "Look deeper into well",
        relevant_stats: ["knowledge", "luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.0025,
          }, {
            type: "luck",
            multiplier: 0.005,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.0025,
          }, {
            type: "luck",
            multiplier: 0.005,
          });

          if (Math.random() < successChance) {
            return {
              events: {
                ...state.events,
                wrongReflections: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents: (state.stats.madnessFromEvents || 0),
              },
              _logMessage:
                "Upon inspection, you see nothing unusual in the well. It must have been a trick of the light or your imagination. The unease lingers, but you feel slightly better.",
            };
          } else {
            return {
              events: {
                ...state.events,
                wrongReflections: true,
              },
              stats: {
                ...state.stats,
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 5),
              },
              _logMessage:
                "You lean over the well's edge. Your reflection grins back with too many teeth and whispers secrets about what was once built where the village stands now. You pull back, but the knowledge remains, burning in your mind.",
            };
          }
        },
      },
      {
        id: "cover_well",
        label: "Cover well with planks",
        effect: (state: GameState) => {
          // In cruel mode, exactly 8 villagers perish of thirst
          const thirstDeaths = state.cruelMode ? 8 : 4;
          const deathResult = killVillagers(state, thirstDeaths);

          return {
            ...deathResult,
            events: {
              ...state.events,
              wrongReflections: true,
            },
            stats: {
              ...state.stats,
              ...(deathResult.stats || {}),
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            _logMessage: `You board up the well with wooden planks, forbidding all access to the unholy water. Building a new well takes too long to finish, and ${thirstDeaths} of the villagers perish of thirst.`,
          };
        },
      },
    ],
  },

  villagersStareAtSky: {
    id: "villagersStareAtSky",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 45 && !state.events.villagersStareAtSky,
    timeProbability: 30,
    title: "Skyward Gaze",
    message:
      "All the villagers have stopped their work and stand motionless, staring at the empty sky. They remain like this for hours, unblinking, while tears of black liquid stream down their faces. When you follow their gaze, you see only ordinary clouds, but something feels terribly wrong.",
    priority: 2,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "shake_them",
        label: "Wake them",
        relevant_stats: ["knowledge", "luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.0025,
          }, {
            type: "luck",
            multiplier: 0.005,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.0025,
          }, {
            type: "luck",
            multiplier: 0.005,
          });

          if (Math.random() < successChance) {
            return {
              events: {
                ...state.events,
                villagersStareAtSky: true,
              },
              _logMessage:
                "You grab the nearest villager and shake them. They blink once and return to normal, but whisper 'It's coming' before resuming their work. The others slowly follow suit.",
            };
          } else {
            const deathResult = killVillagers(state, 1);
            return {
              ...deathResult,
              events: {
                ...state.events,
                villagersStareAtSky: true,
              },
              stats: {
                ...state.stats,
                ...(deathResult.stats || {}),
                madnessFromEvents:
                  (state.stats.madnessFromEvents || 0) +
                  withCruelMadnessBonus(state, 3),
              },
              _logMessage:
                "When you touch one villager, they crumble to dust. The others snap out of their trance and scream, pointing at the sky. For just a moment, you see it too, something vast and hungry watching from above.",
            };
          }
        },
      },
      {
        id: "look_up_too",
        label: "Stare at sky",
        effect: (state: GameState) => ({
          events: {
            ...state.events,
            villagersStareAtSky: true,
          },
          stats: {
            ...state.stats,
            madnessFromEvents:
              (state.stats.madnessFromEvents || 0) +
              withCruelMadnessBonus(state, 4),
          },
          _logMessage:
            "You crane your neck skyward and suddenly see it, something immense and impossible that exists between the clouds. Your mind rejects what it witnesses, but the image burns itself into your memory forever.",
        }),
      },
    ],
  },

  monolithDemand: {
    id: "monolithDemand",
    condition: (state: GameState) =>
      getTotalMadness(state) >= 20 &&
      !state.events.monolithDemand &&
      !state.buildings.blackMonolith,
    timeProbability: 5,
    title: "Demand for the Monolith",
    message:
      "The villagers demand to build a monolith in the village center, a monument to appease the darkness that creeps into their minds. Through sacrifice of animals they want to find peace.",
    priority: 3,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        monolithDemand: true,
      },
      flags: {
        ...state.flags,
        monolithUnlocked: true,
      },
    }),
  },

  humanSacrificeDemand: {
    id: "humanSacrificeDemand",
    condition: (state: GameState) =>
      state.flags.monolithUnlocked &&
      getTotalMadness(state) >= 25 &&
      !state.events.humanSacrificeDemand &&
      state.buildings.blackMonolith > 0,

    timeProbability: 5,
    title: "Dark Hunger",
    message:
      "The villagers gather around the monolith, their eyes hollow. 'The animals are not enough,' they whisper in unison. 'The darkness demands more. It hungers for human souls.' They look at you, waiting for your command to make the ultimate sacrifice.",
    priority: 3,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        humanSacrificeDemand: true,
      },
      flags: {
        ...state.flags,
        humanSacrificeUnlocked: true,
      },
    }),
  },
};
