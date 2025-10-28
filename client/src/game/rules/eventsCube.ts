import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const cubeEvents: Record<string, GameEvent> = {
  cubeDiscovery: {
    id: "cubeDiscovery",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 2 && !state.relics.whispering_cube,
    triggerType: "resource",
    timeProbability: 1,
    title: "The whispering Cube",
    message:
      "Near the cave’s entrance, you discover a perfectly polished metal cube. At first it seems still, but then you feel a faint vibration like a slow, rhythmic pulse, almost like a heartbeat.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              whispering_cube: true,
            },
          };
        },
      },
    ],
  },

  cube01: {
    id: "cube01",
    condition: (state: GameState) =>
      state.relics.whispering_cube &&
      state.story.seen.venturedDeeper &&
      !state.events.cube01,
    triggerType: "resource",
    timeProbability: 1,
    title: "The Cube awakens",
    message:
      "You wake in the night. The cube hums softly. Suddenly a gentle, melodic voice emerges from it: 'Long ago, a great civilization thrived upon this world, but it crumbled, its knowledge lost to the ages.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube01: true,
            },
          };
        },
      },
    ],
  },

  cube02: {
    id: "cube02",
    condition: (state: GameState) =>
      state.story.seen.descendedFurther &&
      state.events.cube01 &&
      !state.events.cube02,
    triggerType: "resource",
    timeProbability: 1,
    title: "The warrior tribe",
    message:
      "'In the distant past, a tribe of fierce warriors was chosen to live deep in the caves. Their purpose was to guard something of great importance.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube02: true,
            },
          };
        },
      },
    ],
  },

  cube03: {
    id: "cube03",
    condition: (state: GameState) =>
      state.story.seen.exploredRuins &&
      state.events.cube02 &&
      !state.events.cube03,
    triggerType: "resource",
    timeProbability: 1,
    title: "The underground city",
    message:
      "'The warrior tribe grew into a vast underground city, safe from the world above, still protecting what they were sent to protect lifetimes ago.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube03: true,
            },
          };
        },
      },
    ],
  },

  cube04: {
    id: "cube04",
    condition: (state: GameState) =>
      state.story.seen.exploredTemple &&
      state.events.cube03 &&
      !state.events.cube04,
    triggerType: "resource",
    timeProbability: 1,
    title: "The sacred oath",
    message:
      "'Though memory of what they protected has faded into legend, their vigilance endured. For generations the warriors have kept their sacred oath, watching over what lies at the city’s deepest point.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube04: true,
            },
          };
        },
      },
    ],
  },

  cube05: {
    id: "cube05",
    condition: (state: GameState) =>
      state.story.seen.exploredCitadel &&
      state.events.cube04 &&
      !state.events.cube05,
    triggerType: "resource",
    timeProbability: 1,
    title: "The sealed portal",
    message:
      "'Long after the inhabitants of the underground city perished, the object of their devotion remained: a colossal, impenetrable portal, crafted with long-forgotten technology, hidden deep within the city’s lowest chambers'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube05: true,
            },
          };
        },
      },
    ],
  },

  cube06: {
    id: "cube06",
    condition: (state: GameState) =>
      state.story.seen.portalBlasted &&
      state.events.cube05 &&
      !state.events.cube06,
    triggerType: "resource",
    timeProbability: 1,
    title: "The portal opens",
    message:
      "As the portal is shatters, the cube trembles in your hands, growing warm. A soft, but urgent whisper escapes it: 'I have gained new insights.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube06: true,
            },
          };
        },
      },
    ],
  },

  cube07: {
    id: "cube07",
    condition: (state: GameState) =>
      state.story.seen.firstWaveVictory &&
      state.events.cube06 &&
      !state.events.cube07,
    triggerType: "resource",
    timeProbability: 1,
    title: "Ancient technology",
    message:
      "'The ancient civilization that forged the portal possessed knowledge and technology far beyond the current age. They even crafted devices designed to be implanted within their skulls, enhancing both mind and body'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube07: true,
            },
          };
        },
      },
    ],
  },

  cube08: {
    id: "cube08",
    condition: (state: GameState) =>
      state.story.seen.secondWaveVictory &&
      state.events.cube07 &&
      !state.events.cube08,
    triggerType: "resource",
    timeProbability: 1,
    title: "The resistance",
    message:
      "'The leaders ruled that every citizen must bear a device in their head. A small faction began to voice their concerns, forming a resistance as they recognized the dangers hidden within the technology.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube08: true,
            },
          };
        },
      },
    ],
  },

  cube09: {
    id: "cube09",
    condition: (state: GameState) =>
      state.story.seen.thirdWaveVictory &&
      state.events.cube08 &&
      !state.events.cube09,
    triggerType: "resource",
    timeProbability: 0.1,
    title: "The golden age",
    message:
      "'With the aid of the devices, the civilization thrived. An era of unprecedented peace and progress began, their knowledge and skill reaching heights that would never be seen again.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube09: true,
            },
          };
        },
      },
    ],
  },

  cube10: {
    id: "cube10",
    condition: (state: GameState) =>
      state.story.seen.fourthWaveVictory &&
      state.events.cube09 &&
      !state.events.cube10,
    triggerType: "resource",
    timeProbability: 1,
    title: "The great collapse",
    message:
      "'One day, without warning, an unimaginable magneto-electric pulse swept across the globe. Every device of the civilization, including those embedded within the skulls, was obliterated.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube10: true,
            },
          };
        },
      },
    ],
  },

  cube11: {
    id: "cube11",
    condition: (state: GameState) =>
      state.story.seen.fifthWaveVictory &&
      state.events.cube10 &&
      !state.events.cube11,
    triggerType: "resource",
    timeProbability: 1,
    title: "End of civilization",
    message:
      "'The survivors could not survive without the devices. Most died. Civilization regressed. Knowledge slipped into oblivion. Nature reclaimed the lands, leaving only buried ruins where greatness once stood.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube11: true,
            },
          };
        },
      },
    ],
  },

  cube13: {
    id: "cube13",
    condition: (state: GameState) =>
      state.story.seen.slaughteredCreatures &&
      state.events.cube11 &&
      !state.events.cube13,
    triggerType: "resource",
    timeProbability: 0.01,
    title: "Recovered data",
    message:
      "The cube pulses with energy as you approach the slain creatures. It seems to extract information from somewhere. The cube grows warm, processing the recovered knowledge.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube13: true,
            },
          };
        },
      },
    ],
  },

  cube14a: {
    id: "cube14a",
    condition: (state: GameState) =>
      (state.events.cube13 || state.story.seen.communicatedWithCreatures) &&
      state.events.cube11 &&
      !state.events.cube14a,
    triggerType: "resource",
    timeProbability: 0.01,
    title: "The resistance",
    message:
      "'When the resistance opposed the skull devices, they were exiled into the mountain’s depths, sealed away behind the portal. With no path back, they dug ever deeper. In isolation and darkness, their minds eroded and they descended into madness and degeneration.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "continue",
        label: "Continue",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube14a: true,
            },
          };
        },
      },
    ],
  },

  cube14b: {
    id: "cube14b",
    condition: (state: GameState) =>
      state.events.cube14a && !state.events.cube14b,
    triggerType: "resource",
    timeProbability: 0.001,
    title: "The unknown ore",
    message:
      "'One day, deep in the earth, they found a monolith of unknown ore. From it they forged an explosive to destroy the portal. But the bomb failed to breach the portal, instead unleashed an electro-magnetic pulse spanning the whole planet destroying all devices.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "continue",
        label: "Continue",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube14b: true,
            },
          };
        },
      },
    ],
  },

  cube14c: {
    id: "cube14c",
    condition: (state: GameState) =>
      state.events.cube14b && !state.events.cube14c,
    triggerType: "resource",
    timeProbability: 0.001,
    title: "The unknown ore",
    message:
      "'Shortly after the explosion, a man standing nearby began to dematerialize, his form flickering, half-transparent for seconds. Terrified and driven mad by what had happened, he took his own life moments later.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "continue",
        label: "Continue",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube14c: true,
            },
          };
        },
      },
    ],
  },

  cube14d: {
    id: "cube14d",
    condition: (state: GameState) =>
      state.events.cube14c && !state.events.cube14d,
    triggerType: "resource",
    timeProbability: 0.001,
    title: "Through the portal",
    message:
      "'Desperate, the survivors theorized the ore could help them pass through the portal. With its last fragments, they built a smaller bomb and positioned their sanest man with it before the portal. Right after the blast, he turned ghostly, translucent, and then vanished through the portal.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube14d: true,
            },
          };
        },
      },
    ],
  },

  cube15a: {
    id: "cube15a",
    condition: (state: GameState) =>
      state.events.cube14d &&
      state.story.seen.slaughteredCreatures &&
      !state.events.cube15a,
    triggerType: "resource",
    timeProbability: 0.001,
    title: "Recognition",
    message:
      "That was when you recognize that the creatures did not attack as they recognized you as one of their own. You are the man who vanished through the portal.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube15a: true,
            },
          };
        },
      },
    ],
  },

  cube15b: {
    id: "cube15b",
    condition: (state: GameState) =>
      state.events.cube14d &&
      state.story.seen.communicatedWithCreatures &&
      !state.events.cube15b,
    triggerType: "resource",
    timeProbability: 0.001,
    title: "Recognition",
    message:
      "After finishing their story one of the survivors steps forward, pointing at you: 'You are the man who vanished through the portal. You are one of us.",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "close",
        label: "Close",
        effect: (state: GameState) => {
          return {
            events: {
              ...state.events,
              cube15b: true,
            },
          };
        },
      },
    ],
  },
};
