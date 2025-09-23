
import { GameEvent } from "./events";

// Define a type for the game state
type GameState = {
  villagers: {
    free: number;
    gatherer: number;
    hunter: number;
    iron_miner: number;
    coal_miner: number;
    sulfur_miner: number;
    gold_miner: number;
    obsidian_miner: number;
    adamant_miner: number;
    moonstone_miner: number;
    steel_forger: number;
    [key: string]: number;
  };
  resources: {
    [key: string]: number;
  };
  buildings: { woodenHut: number; hut: number; shrine?: number };
  stats: { strength?: number; luck?: number; knowledge?: number; madness?: number };
  relics: { [key: string]: boolean };
  events: { [key: string]: boolean };
  flags: { [key: string]: boolean };
  tools: { [key: string]: boolean };
  clothing?: { [key: string]: boolean };
  current_population?: number;
};

// Centralized function to kill villagers
function killVillagers(state: GameState, amount: number): Partial<GameState> {
  let updatedVillagers = { ...state.villagers };
  let remainingDeaths = amount;

  // Define all possible villager types that can be killed
  const villagerTypes: (keyof typeof updatedVillagers)[] = [
    "free",
    "gatherer",
    "hunter",
    "iron_miner",
    "coal_miner",
    "sulfur_miner",
    "silver_miner",
    "gold_miner",
    "obsidian_miner",
    "adamant_miner",
    "moonstone_miner",
    "steel_forger",
  ];

  // Shuffle villager types to ensure random distribution of deaths
  for (let i = villagerTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [villagerTypes[i], villagerTypes[j]] = [villagerTypes[j], villagerTypes[i]];
  }

  for (const villagerType of villagerTypes) {
    if (remainingDeaths <= 0) break;

    const currentCount = updatedVillagers[villagerType] || 0;
    if (currentCount > 0) {
      const deaths = Math.min(remainingDeaths, currentCount);
      updatedVillagers[villagerType] = currentCount - deaths;
      remainingDeaths -= deaths;
    }
  }

  return { villagers: updatedVillagers };
}

export const madnessEvents: Record<string, GameEvent> = {
  // Madness Level 10 Events
  whisperingVoices: {
    id: "whisperingVoices",
    condition: (state: GameState) => 
      (state.stats.madness || 0) >= 10 && 
      !state.events.whisperingVoices,
    triggerType: "resource",
    timeProbability: 60,
    title: "Whispering Voices",
    message: "You hear faint whispers in the wind, speaking words in no language you recognize. The villagers seem oblivious, but the voices grow clearer each day. They speak of ancient things buried beneath the earth.",
    triggered: false,
    priority: 2,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        whisperingVoices: true,
      },
      stats: {
        ...state.stats,
        madness: (state.stats.madness || 0) + 2,
      },
    }),
  },

  shadowsMove: {
    id: "shadowsMove",
    condition: (state: GameState) => 
      (state.stats.madness || 0) >= 10,
    triggerType: "resource",
    timeProbability: 90,
    message: "The shadows in your village move wrong. They stretch too long, twist at impossible angles, and sometimes seem to move independently of their sources. You catch glimpses of shapes that shouldn't be there.",
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

  // Madness Level 20 Events
  villagerStares: {
    id: "villagerStares",
    condition: (state: GameState) => 
      (state.stats.madness || 0) >= 20 && 
      state.villagers.free > 0,
    triggerType: "resource",
    timeProbability: 45,
    title: "Hollow Stares",
    message: "One of your villagers has begun staring at nothing for hours. When you approach, their eyes are completely black, reflecting depths that seem to go on forever. They smile when they notice you watching.",
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
                madness: (state.stats.madness || 0) + 5,
              },
              _logMessage: "You confront the villager. They turn to you with that black-eyed smile and whisper something that makes your mind reel. The words echo in your head for days.",
            };
          } else {
            const deathResult = killVillagers(state, 1);
            return {
              ...deathResult,
              _logMessage: "As you approach, the villager's smile widens impossibly. They collapse, black fluid pouring from their eyes and mouth. You realize they've been dead for hours.",
            };
          }
        },
      },
      {
        id: "avoid",
        label: "Avoid them",
        effect: (state: GameState) => ({
          stats: {
            ...state.stats,
            madness: (state.stats.madness || 0) + 2,
          },
          _logMessage: "You avoid the villager, but you feel their hollow gaze following you wherever you go. Sleep becomes difficult.",
        }),
      },
    ],
  },

  bloodInWater: {
    id: "bloodInWater",
    condition: (state: GameState) => 
      (state.stats.madness || 0) >= 20,
    triggerType: "resource",
    timeProbability: 75,
    message: "The village water runs red for three days. The villagers don't seem to notice, drinking it as if nothing has changed. You taste copper and iron, but they claim it tastes like the sweetest spring water.",
    triggered: false,
    priority: 2,
    repeatable: true,
    effect: (state: GameState) => ({
      stats: {
        ...state.stats,
        madness: (state.stats.madness || 0) + 3,
      },
    }),
  },

  // Madness Level 30 Events
  facesInWalls: {
    id: "facesInWalls",
    condition: (state: GameState) => 
      (state.stats.madness || 0) >= 30,
    triggerType: "resource",
    timeProbability: 60,
    title: "Faces in the Walls",
    message: "The wooden walls of your huts have begun showing faces - twisted, agonized expressions that seem to push through from the other side. They mouth silent screams and pleas. The villagers step around them as if they've always been there.",
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
            madness: (state.stats.madness || 0) + 8,
          },
          _logMessage: "You lean close to one of the faces. Its eyes snap open and it whispers your name, along with the names of everyone you've ever loved. You recognize it as someone who died years ago.",
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
          _logMessage: "You try to ignore the faces, but they multiply. Soon every wooden surface in the village bears the mark of tortured souls.",
        }),
      },
    ],
  },

  wrongVillagers: {
    id: "wrongVillagers",
    condition: (state: GameState) => 
      (state.stats.madness || 0) >= 30 && 
      state.villagers.free > 2,
    triggerType: "resource",
    timeProbability: 90,
    message: "You count your villagers and there are three more than there should be. The extra ones look exactly like villagers who died months ago. They work, eat, and sleep normally, but their eyes hold depths of ancient malice.",
    triggered: false,
    priority: 2,
    repeatable: true,
    effect: (state: GameState) => ({
      stats: {
        ...state.stats,
        madness: (state.stats.madness || 0) + 4,
      },
    }),
  },

  // Madness Level 40 Events
  skinCrawling: {
    id: "skinCrawling",
    condition: (state: GameState) => 
      (state.stats.madness || 0) >= 40,
    triggerType: "resource",
    timeProbability: 45,
    title: "Crawling Skin",
    message: "Your skin begins to crawl - literally. You can see shapes moving beneath the surface, creating patterns that spell out words in languages that predate humanity. The villagers watch you scratch bloody furrows in your arms with expressions of hungry anticipation.",
    triggered: false,
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "scratch",
        label: "Scratch deeper to see what's underneath",
        effect: (state: GameState) => ({
          stats: {
            ...state.stats,
            madness: (state.stats.madness || 0) + 12,
          },
          _logMessage: "You dig deep into your flesh. Beneath your skin, you find not muscle and bone, but writhing darkness filled with eyes that blink in unison. They all look directly at you and whisper 'welcome home.'",
        }),
      },
      {
        id: "endure",
        label: "Endure the sensation",
        effect: (state: GameState) => ({
          stats: {
            ...state.stats,
            madness: (state.stats.madness || 0) + 6,
          },
          _logMessage: "You clench your fists and endure. The crawling sensation grows stronger, and you realize the things under your skin are trying to spell out the true name of something that should never be named.",
        }),
      },
    ],
  },

  villageBackwards: {
    id: "villageBackwards",
    condition: (state: GameState) => 
      (state.stats.madness || 0) >= 40,
    triggerType: "resource",
    timeProbability: 80,
    message: "Your village is running backwards. Smoke flows down into chimneys, the sun sets in the east, and the villagers walk in reverse while speaking in mirror speech. You are the only one moving forward through this inverted world.",
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

  // Madness Level 50 Events
  realityBleed: {
    id: "realityBleed",
    condition: (state: GameState) => 
      (state.stats.madness || 0) >= 50,
    triggerType: "resource",
    timeProbability: 30,
    title: "Reality Bleeds",
    message: "The boundaries between what is real and what is not have begun to dissolve. You see the village as it truly is: a feeding ground for entities that exist in the spaces between thoughts. The villagers are not villagers - they are bait, and you are the trap.",
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
          _logMessage: "You fight against the dissolution of reality, clinging to what you know to be true. The effort is enormous, but you manage to push back the bleeding edges of madness, if only temporarily.",
        }),
      },
    ],
  },

  endlessVoid: {
    id: "endlessVoid",
    condition: (state: GameState) => 
      (state.stats.madness || 0) >= 50,
    triggerType: "resource",
    timeProbability: 60,
    title: "The Endless Void",
    message: "You wake to find your village floating in an endless void. The ground extends only a few feet beyond the buildings before dropping into absolute nothingness. Stars wheel overhead in patterns that hurt to observe. The villagers continue their routines as if nothing has changed.",
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
              _logMessage: "You peer into the void and the void peers back. You fall upward into the spaces between stars, your consciousness scattered across infinite dimensions of suffering.",
            };
          } else {
            return {
              stats: {
                ...state.stats,
                madness: (state.stats.madness || 0) + 15,
              },
              _logMessage: "At the edge of the void, you see other villages floating in the darkness - infinite copies of your own settlement, each with a version of yourself staring back at you from the precipice.",
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
          _logMessage: "You stay in the center of the village, but the void calls to you. You can feel it pulling at the edges of your sanity, promising revelations that would unmake your mind.",
        }),
      },
    ],
  },

  madnessOverflow: {
    id: "madnessOverflow",
    condition: (state: GameState) => 
      (state.stats.madness || 0) >= 100,
    triggerType: "resource",
    timeProbability: 1,
    title: "Madness Consumes All",
    message: "Your madness has reached its zenith. Reality itself bends around your fractured mind. The village, the cave, the forest - all of it was never real. You are something ancient and hungry, dreaming of mortality. As you wake, the dream dissolves.",
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
        _logMessage: "The dream ends. Reality dissolves. You are awake now, and you are hungry.",
      };
    },
  },
};
