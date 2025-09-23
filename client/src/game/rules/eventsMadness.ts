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
    condition: (state: GameState) => (state.stats.madness || 0) >= 35,
    triggerType: "resource",
    timeProbability: 40,
    title: "Crawling Skin",
    message:
      "Your skin begins to crawl - literally. You can see shapes moving beneath the surface, creating patterns that spell out words in languages that predate humanity. The villagers watch you scratch bloody furrows in your arms with expressions of great worry.",
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

}