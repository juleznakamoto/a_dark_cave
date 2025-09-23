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
    condition: (state: GameState) => (state.stats.madness || 0) >= 15 && !state.events.shadowsMove,
    triggerType: "resource",
    timeProbability: 75,
    message:
      "The shadows in your village seem to move wrong. They stretch too long, twist at impossible angles, and sometimes seem to move independently of their sources. You catch glimpses of shapes that shouldn't be there.",
    triggered: false,
    priority: 1,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        shadowsMove: true,
      },
      stats: {
        ...state.stats,
        madness: (state.stats.madness || 0) + 2,
      },
    }),
  },

  villagerStares: {
    id: "villagerStares",
    condition: (state: GameState) =>
      (state.stats.madness || 0) >= 20 && state.villagers.free > 0 && !state.events.villagerStares,
    triggerType: "resource",
    timeProbability: 45,
    title: "Hollow Stares",
    message:
      "One of your villagers has begun staring at nothing for hours. When you approach, their eyes are completely black, reflecting depths that seem to go on forever. They smile when they notice you watching.",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "confront",
        label: "Confront the villager",
        effect: (state: GameState) => {
          const rand = Math.random();
          if (rand < 0.3) {
            return {
              events: {
                ...state.events,
                villagerStares: true,
              },
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
              events: {
                ...state.events,
                villagerStares: true,
              },
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
            events: {
              ...state.events,
              villagerStares: true,
            },
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
    condition: (state: GameState) => (state.stats.madness || 0) >= 25 && !state.events.bloodInWater,
    triggerType: "resource",
    timeProbability: 75,
    message:
      "The village water runs red for three days. The villagers don't seem to notice, drinking it as if nothing has changed. You taste copper and iron, but they claim it tastes like the sweetest spring water.",
    triggered: false,
    priority: 2,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        bloodInWater: true,
      },
      stats: {},
    }),
  },

  facesInWalls: {
    id: "facesInWalls",
    condition: (state: GameState) => (state.stats.madness || 0) >= 25 && !state.events.facesInWalls,
    triggerType: "resource",
    timeProbability: 60,
    title: "Faces in the Walls",
    message:
      "The wooden walls of your huts have begun showing faces - twisted, agonized expressions that seem to push through from the other side. They mouth silent screams and pleas. The villagers step around them as if they've always been there.",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "examine",
        label: "Examine the faces closely",
        effect: (state: GameState) => ({
          events: {
            ...state.events,
            facesInWalls: true,
          },
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
          events: {
            ...state.events,
            facesInWalls: true,
          },
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
             spaceForThree &&
             !state.events.wrongVillagers;
    },
    triggerType: "resource",
    timeProbability: 30,
    message:
      "You count your villagers and there are three more than there should be. The extra ones look exactly like villagers who died months ago. They work, eat, and sleep normally, but their eyes hold depths of ancient malice.",
    triggered: false,
    priority: 2,
    repeatable: false,
    effect: (state: GameState) => ({
      events: {
        ...state.events,
        wrongVillagers: true,
      },
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
    condition: (state: GameState) => (state.stats.madness || 0) >= 35 && !state.events.skinCrawling,
    triggerType: "resource",
    timeProbability: 40,
    title: "Crawling Skin",
    message:
      "Your skin begins to crawl - literally. You can see shapes moving beneath the surface, creating patterns that spell out words in languages that predate humanity. The villagers watch you scratch bloody furrows in your arms with expressions of great worry.",
    triggered: false,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "calm_down",
        label: "Try to calm down",
        effect: (state: GameState) => {
          const rand = Math.random();
          if (rand < 0.5) {
            return {
              events: {
                ...state.events,
                skinCrawling: true,
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
            events: {
              ...state.events,
              skinCrawling: true,
            },
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

  creatureInHut: {
    id: "creatureInHut",
    condition: (state: GameState) => (state.stats.madness || 0) >= 35 && state.buildings.woodenHut > 0 && !state.events.creatureInHut,
    triggerType: "resource",
    timeProbability: 50,
    title: "Something in the Hut",
    message:
      "Through the cracks in one of your wooden huts, you glimpse something that shouldn't be there. A dark shape moves in the darkness, too tall and too thin to be human. Its limbs bend wrong, and when it turns toward you, you see eyes like dying stars.",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "do_nothing",
        label: "Do nothing and look away",
        effect: (state: GameState) => ({
          events: {
            ...state.events,
            creatureInHut: true,
          },
          stats: {
            ...state.stats,
            madness: (state.stats.madness || 0) + 3,
          },
          _logMessage:
            "You turn away and try to forget what you saw. But in your dreams, the creature visits you. It whispers your name with a voice like grinding stone, and shows you visions of what lies beneath the earth.",
        }),
      },
      {
        id: "burn_hut",
        label: "Burn the hut to destroy the creature",
        effect: (state: GameState) => {
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
            _logMessage:
              "You set the hut ablaze. The flames consume everything - including the two villagers sleeping inside, and the structure itself. In the morning, you find only ash and the lingering smell of something that was never meant to burn.",
          };
        },
      },
    ],
  },

  wrongReflections: {
    id: "wrongReflections",
    condition: (state: GameState) => (state.stats.madness || 0) >= 40 && !state.events.wrongReflections,
    triggerType: "resource",
    timeProbability: 55,
    title: "Wrong Reflections",
    message:
      "The surface of the village well shows reflections that don't match reality. You see yourself, but older, with hollow eyes and a mouth full of darkness.",
    triggered: false,
    priority: 2,
    repeatable: false,
    choices: [
      {
        id: "investigate",
        label: "Look deeper into the well",
        effect: (state: GameState) => ({
          events: {
            ...state.events,
            wrongReflections: true,
          },
          stats: {
            ...state.stats,
            madness: (state.stats.madness || 0) + 5,
          },
          _logMessage:
            "You lean over the well's edge. Your reflection grins back with too many teeth and whispers secrets about what was once built where the village stands now. You pull back, but the knowledge remains, burning in your mind.",
        }),
      },
      {
        id: "cover_well",
        label: "Cover the well with planks",
        effect: (state: GameState) => {
          // Kill 4-8 older villagers from thirst
          const thirstDeaths = Math.floor(Math.random() * 5) + 6; // 6-10 deaths
          const deathResult = killVillagers(state, thirstDeaths);
          
          return {
            ...deathResult,
            flags: {
              ...state.flags,
              needsNewWell: true,
            },
            _logMessage:
              `You board up the well with wooden planks, forbidding all access to the unholy water. Building a new well takes too long to finish, and ${thirstDeaths} of the weaker villagers perish of thirst.`,
          };
        },
      },
    ],
  },

  villagersStareAtSky: {
    id: "villagersStareAtSky",
    condition: (state: GameState) => (state.stats.madness || 0) >= 45 && !state.events.villagersStareAtSky,
    triggerType: "resource",
    timeProbability: 40,
    title: "Skyward Gaze",
    message:
      "All your villagers have stopped their work and stand motionless, staring at the empty sky. They remain like this for hours, unblinking, while tears of black liquid stream down their faces. When you follow their gaze, you see only ordinary clouds, but something feels terribly wrong.",
    triggered: false,
    priority: 2,
    repeatable: false,
    choices: [
      {
        id: "shake_them",
        label: "Try to shake them out of it",
        effect: (state: GameState) => {
          const rand = Math.random();
          if (rand < 0.6) {
            return {
              events: {
                ...state.events,
                villagersStareAtSky: true,
              },
              stats: {
                ...state.stats,
                madness: (state.stats.madness || 0) + 3,
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
                madness: (state.stats.madness || 0) + 4,
              },
              _logMessage:
                "When you touch one villager, they crumble to dust. The others snap out of their trance and scream, pointing at the sky. For just a moment, you see it too - something vast and hungry watching from above.",
            };
          }
        },
      },
      {
        id: "look_up_too",
        label: "Look up at what they're seeing",
        effect: (state: GameState) => ({
          events: {
            ...state.events,
            villagersStareAtSky: true,
          },
          stats: {
            ...state.stats,
            madness: (state.stats.madness || 0) + 6,
          },
          _logMessage:
            "You crane your neck skyward and suddenly see it - something immense and impossible that exists between the clouds. Your mind rejects what it witnesses, but the image burns itself into your memory forever.",
        }),
      },
    ],
  },
}