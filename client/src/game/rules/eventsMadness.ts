import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

export const madnessEvents: Record<string, GameEvent> = {
  whisperingVoices: {
    id: "whisperingVoices",
    condition: (state: GameState) =>
      (state.stats.madness || 0) >= 10 && !state.events.whisperingVoices,
    triggerType: "resource",
    timeProbability: 90,
    title: "Whispering Voices",
    message:
      "You hear faint whispers in the wind, speaking words in no language you recognize. The villagers seem oblivious, but the voices grow clearer each day. They speak of ancient things buried beneath the earth.",
    triggered: false,
    priority: 2,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        whisperingVoices: true,
      },
      stats: {},
    }),
  },

  shadowsMove: {
    id: "shadowsMove",
    condition: (state: GameState) => (state.stats.madness || 0) >= 15,
    triggerType: "resource",
    timeProbability: 90,
    message:
      "The shadows in your village seem to move wrong. They stretch too long, twist at impossible angles, and sometimes seem to move independently of their sources. You catch glimpses of shapes that shouldn't be there.",
    triggered: false,
    priority: 1,
    repeatable: true,
    effect: (state: GameState) => ({
      stats: {
        ...state.stats,
        madness: (state.stats.madness || 0) + 1,
      },
    }),
  },

  villagerStares: {
    id: "villagerStares",
    condition: (state: GameState) =>
      (state.stats.madness || 0) >= 20 && state.villagers.free > 0,
    triggerType: "resource",
    timeProbability: 45,
    title: "Hollow Stares",
    message:
      "One of your villagers has begun staring at nothing for hours. When you approach, their eyes are completely black, reflecting depths that seem to go on forever. They smile when they notice you watching.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "confront",
        label: "Confront the villager",
        effect: (state: GameState) => {
          const rand = Math.random();
          if (rand < 0.3) {
            return {
              stats: {
                ...state.stats,
                madness: (state.stats.madness || 0) + 3,
              },
              _logMessage:
                "You confront the villager. They turn to you with that black-eyed smile and whisper something that makes your mind reel. The words echo in your head for days.",
            };
          } else {
            const deathResult = killVillagers(state, 1);
            return {
              ...deathResult,
              _logMessage:
                "As you approach, the villager's smile widens impossibly. They collapse, black fluid pouring from their eyes and mouth. You realize they've been dead for hours.",
            };
          }
        },
      },
      {
        id: "avoid",
        label: "Avoid them",
        effect: (state: GameState) => {
          const deathResult = killVillagers(state, 1);
          return {
            ...deathResult,
            stats: {
              ...state.stats,
              madness: (state.stats.madness || 0) + 3,
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
    condition: (state: GameState) => (state.stats.madness || 0) >= 25,
    triggerType: "resource",
    timeProbability: 75,
    message:
      "The village water runs red for three days. The villagers don't seem to notice, drinking it as if nothing has changed. You taste copper and iron, but they claim it tastes like the sweetest spring water.",
    triggered: false,
    priority: 2,
    repeatable: true,
    effect: (state: GameState) => ({
      stats: {},
    }),
  },

  facesInWalls: {
    id: "facesInWalls",
    condition: (state: GameState) => (state.stats.madness || 0) >= 30,
    triggerType: "resource",
    timeProbability: 60,
    title: "Faces in the Walls",
    message:
      "The wooden walls of your huts have begun showing faces - twisted, agonized expressions that seem to push through from the other side. They mouth silent screams and pleas. The villagers step around them as if they've always been there.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "examine",
        label: "Examine the faces closely",
        effect: (state: GameState) => ({
          stats: {
            ...state.stats,
            madness: (state.stats.madness || 0) + 5,
          },
          _logMessage:
            "You lean close to one of the faces. Its eyes snap open and it whispers your name, along with the name. You recognize it as someone who died years ago.",
        }),
      },
      {
        id: "ignore",
        label: "Try to ignore them",
        effect: (state: GameState) => ({
          stats: {
            ...state.stats,
            madness: (state.stats.madness || 0) + 3,
          },
          _logMessage:
            "You try to ignore the faces, but they multiply. Soon every wooden surface in the village bears the mark of tortured souls.",
        }),
      },
    ],
  },

  wrongVillagers: {
    id: "wrongVillagers",
    condition: (state: GameState) => {
      const currentPopulation = state.current_population || 0;
      const maxPopulation = (state.buildings.woodenHut * 2) + (state.buildings.stoneHut * 4);
      const spaceForThree = currentPopulation + 3 <= maxPopulation;

      return (state.stats.madness || 0) >= 30 &&
             state.villagers.free > 2 &&
             spaceForThree;
    },
    triggerType: "resource",
    timeProbability: 30,
    message:
      "You count your villagers and there are three more than there should be. The extra ones look exactly like villagers who died months ago. They work, eat, and sleep normally, but their eyes hold depths of ancient malice.",
    triggered: false,
    priority: 2,
    repeatable: true,
    effect: (state: GameState) => ({
      villagers: {
        ...state.villagers,
        free: state.villagers.free + 3,
      },
      stats: {
        ...state.stats,
        madness: (state.stats.madness || 0) + 2,
      },
    }),
  },

  skinCrawling: {
    id: "skinCrawling",
    condition: (state: GameState) => (state.stats.madness || 0) >= 40,
    triggerType: "resource",
    timeProbability: 45,
    title: "Crawling Skin",
    message:
      "Your skin begins to crawl - literally. You can see shapes moving beneath the surface, creating patterns that spell out words in languages that predate humanity. The villagers watch you scratch bloody furrows in your arms with expressions of hungry anticipation.",
    triggered: false,
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "calm_down",
        label: "Try to calm down",
        effect: (state: GameState) => {
          const rand = Math.random();
          if (rand < 0.5) {
            return {
              _logMessage:
                "You take deep breaths and force yourself to remain still. The crawling sensation gradually fades, and your skin returns to normal. You have conquered this horror through sheer willpower.",
            };
          } else {
            return {
              stats: {
                ...state.stats,
                madness: (state.stats.madness || 0) + 3,
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
          const killedVillagers = Math.floor(Math.random() * 4) + 3; // 3-6 villagers
          const deathResult = killVillagers(state, killedVillagers);
          return {
            ...deathResult,
            stats: {
              ...state.stats,
              madness: (state.stats.madness || 0) + 2,
            },
            _logMessage:
              `You claw frantically at your skin, drawing blood. The villagers rush to stop you, grabbing your arms. In your maddened rage, you lash out violently, killing ${killedVillagers} villagers before collapsing from exhaustion. When you awaken, the crawling has stopped, but blood stains your hands.`,
          };
        },
      },
    ],
  },

  villageBackwards: {
    id: "villageBackwards",
    condition: (state: GameState) => (state.stats.madness || 0) >= 40,
    triggerType: "resource",
    timeProbability: 80,
    message:
      "Your village is running backwards. Smoke flows down into chimneys, the sun sets in the east, and the villagers walk in reverse while speaking in mirror speech. You are the only one moving forward through this inverted world.",
    triggered: false,
    priority: 2,
    repeatable: true,
    effect: (state: GameState) => ({
      stats: {
        ...state.stats,
        madness: (state.stats.madness || 0) + 5,
      },
    }),
  },

  realityBleed: {
    id: "realityBleed",
    condition: (state: GameState) => (state.stats.madness || 0) >= 50,
    triggerType: "resource",
    timeProbability: 30,
    title: "Reality Bleeds",
    message:
      "The boundaries between what is real and what is not have begun to dissolve. You see the village as it truly is: a feeding ground for entities that exist in the spaces between thoughts. The villagers are not villagers - they are bait, and you are the trap.",
    triggered: false,
    priority: 5,
    repeatable: true,
    choices: [
      {
        id: "accept",
        label: "Accept the truth",
        effect: (state: GameState) => {
          const populationLoss = Math.floor(state.current_population * 0.3);
          const deathResult = killVillagers(state, populationLoss);
          return {
            ...deathResult,
            stats: {
              ...state.stats,
              madness: 100,
            },
            _logMessage: `You accept the truth and become one with the entities that feed on reality itself. ${populationLoss} villagers dissolve into the spaces between moments, their screams echoing across dimensions. You are no longer human.`,
          };
        },
      },
      {
        id: "resist",
        label: "Fight to maintain sanity",
        effect: (state: GameState) => ({
          stats: {
            ...state.stats,
            madness: Math.max(0, (state.stats.madness || 0) - 10),
          },
          _logMessage:
            "You fight against the dissolution of reality, clinging to what you know to be true. The effort is enormous, but you manage to push back the bleeding edges of madness, if only temporarily.",
        }),
      },
    ],
  },

  endlessVoid: {
    id: "endlessVoid",
    condition: (state: GameState) => (state.stats.madness || 0) >= 50,
    triggerType: "resource",
    timeProbability: 60,
    title: "The Endless Void",
    message:
      "You wake to find your village floating in an endless void. The ground extends only a few feet beyond the buildings before dropping into absolute nothingness. Stars wheel overhead in patterns that hurt to observe. The villagers continue their routines as if nothing has changed.",
    triggered: false,
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "investigate",
        label: "Investigate the edge of reality",
        effect: (state: GameState) => {
          const rand = Math.random();
          if (rand < 0.4) {
            return {
              stats: {
                ...state.stats,
                madness: 100,
              },
              _logMessage:
                "You peer into the void and the void peers back. You fall upward into the spaces between stars, your consciousness scattered across infinite dimensions of suffering.",
            };
          } else {
            return {
              stats: {
                ...state.stats,
                madness: (state.stats.madness || 0) + 15,
              },
              _logMessage:
                "At the edge of the void, you see other villages floating in the darkness - infinite copies of your own settlement, each with a version of yourself staring back at you from the precipice.",
            };
          }
        },
      },
      {
        id: "stay",
        label: "Stay away from the edge",
        effect: (state: GameState) => ({
          stats: {
            ...state.stats,
            madness: (state.stats.madness || 0) + 8,
          },
          _logMessage:
            "You stay in the center of the village, but the void calls to you. You can feel it pulling at the edges of your sanity, promising revelations that would unmake your mind.",
        }),
      },
    ],
  },

  madnessOverflow: {
    id: "madnessOverflow",
    condition: (state: GameState) => (state.stats.madness || 0) >= 100,
    triggerType: "resource",
    timeProbability: 1,
    title: "Madness Consumes All",
    message:
      "Your madness has reached its zenith. Reality itself bends around your fractured mind. The village, the cave, the forest - all of it was never real. You are something ancient and hungry, dreaming of mortality. As you wake, the dream dissolves.",
    triggered: false,
    priority: 10,
    repeatable: false,
    effect: (state: GameState) => {
      const totalPopulation = state.current_population || 0;
      const deathResult = killVillagers(state, totalPopulation);
      return {
        ...deathResult,
        resources: {
          wood: 0,
          food: 0,
          torch: 0,
          stone: 0,
          iron: 0,
          coal: 0,
          steel: 0,
          sulfur: 0,
          silver: 0,
          obsidian: 0,
          adamant: 0,
          moonstone: 0,
          gold: 0,
          bones: 0,
          fur: 0,
          leather: 0,
          bloodstone: 0,
          frostglas: 0,
          bone_totem: 0,
        },
        buildings: {
          woodenHut: 0,
          traps: 0,
          cabin: 0,
          blacksmith: 0,
          shallowPit: 0,
          deepeningPit: 0,
          deepPit: 0,
          bottomlessPit: 0,
          foundry: 0,
          shrine: 0,
          greatCabin: 0,
          timberMill: 0,
          quarry: 0,
          clerksHut: 0,
          stoneHut: 0,
        },
        _logMessage:
          "The dream ends. Reality dissolves. You are awake now, and you are hungry.",
      };
    },
  },
};