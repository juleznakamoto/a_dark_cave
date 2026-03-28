import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

const CUBE_EVENT_TEXT: Record<string, { title: string; message: string }> = {
  cubeDiscovery: {
    title: "The Whispering Cube",
    message:
      "Near the cave's entrance, you discover a perfectly polished metal cube. At first it seems still, but then you feel a faint vibration like a slow, rhythmic pulse, almost like a heartbeat.",
  },
  cube01: {
    title: "The Cube Awakens",
    message:
      "You wake in the night. The cube hums softly. Suddenly a gentle, melodic voice emerges from it: 'Long ago, a great civilization thrived upon this world, but it crumbled, its knowledge lost to the ages.'",
  },
  cube02: {
    title: "The Warrior Tribe",
    message:
      "'In the distant past, a tribe of fierce warriors was chosen to live deep in the caves. Their purpose was to guard something of great importance.'",
  },
  cube03: {
    title: "The Underground City",
    message:
      "'The warrior tribe grew into a vast underground city, safe from the world above, still protecting what they were sent to protect lifetimes ago.'",
  },
  cube04: {
    title: "The Sacred Oath",
    message:
      "'Though memory of what they protected has faded into legend, their vigilance endured. For generations the warriors have kept their sacred oath, watching over what lies at the city's deepest point.'",
  },
  cube05: {
    title: "The Sealed Gate",
    message:
      "'Long after the inhabitants of the underground city perished, the object of their devotion remained: a colossal, impenetrable gate, crafted with long-forgotten technology, hidden deep within the city's lowest chambers'",
  },
  cube06: {
    title: "The Gate Opens",
    message:
      "As the gate is shatters, the cube trembles in your hands, growing warm. A soft, but urgent whisper escapes it: 'I have gained new insights.'",
  },
  cube07: {
    title: "Ancient Technology",
    message:
      "'The ancient civilization that forged the gate possessed knowledge and technology far beyond the current age. They even crafted devices designed to be implanted within their skulls, enhancing both mind and body'",
  },
  cube08: {
    title: "The Resistance",
    message:
      "'The leaders ruled that every citizen must bear a device in their head. A small faction began to voice their concerns, forming a resistance as they recognized the dangers hidden within the technology.'",
  },
  cube09: {
    title: "The Golden Age",
    message:
      "'With the aid of the devices, the civilization thrived. An era of unprecedented peace and progress began, their knowledge and skill reaching heights that would never be seen again.'",
  },
  cube10: {
    title: "The Great Collapse",
    message:
      "'Knowledge flowed instantly, and society thrived. Behind the progress, the skull devices orchestrated humanity's thoughts, connecting minds in a quiet, inescapable web.''",
  },
  cube11: {
    title: "The Hive Mind",
    message:
      "'One day, without warning, an unimaginable magneto-electric pulse swept across the globe. Every device of the civilization, including those embedded within the skulls, was obliterated.'",
  },
  cube12: {
    title: "End of Civilization",
    message:
      "'The few survivors could not survive without the devices. Most died. Civilization regressed. Knowledge slipped into oblivion. Nature reclaimed the lands, leaving only buried ruins where greatness once stood.'",
  },
  cube13: {
    title: "Recovered Data",
    message:
      "The cube pulses with energy as you approach the slain creatures. It seems to extract information from somewhere. The cube grows warm, processing the recovered knowledge.",
  },
  cube14a: {
    title: "The Resistance",
    message:
      "'When the resistance opposed the skull devices, they were exiled into the mountain's depths, sealed away behind the gate. With no path back, they dug ever deeper. In isolation and darkness, their minds eroded and they descended into madness and degeneration.'",
  },
  cube14b: {
    title: "The Unknown Ore",
    message:
      "'One day, deep in the earth, they found a monolith of unknown ore. From it they forged an explosive to destroy the gate. But the bomb failed to breach the gate, instead unleashed an electro-magnetic pulse spanning the whole planet destroying all devices, ending civilization.'",
  },
  cube14c: {
    title: "The Unknown Ore",
    message:
      "'Shortly after the explosion, a man standing nearby began to dematerialize, his form flickering, half-transparent for seconds. Terrified and driven mad by what had happened, he took his own life moments later.'",
  },
  cube14d: {
    title: "Through the Gate",
    message:
      "'Desperate, the survivors theorized the ore could help them pass through the gate. With its last fragments, they built a smaller bomb and positioned their sanest man with it before the gate. Right after the blast, he turned ghostly, translucent, and then vanished through the gate.'",
  },
  cube15a: {
    title: "Recognition",
    message:
      "That was when you recognize that the creatures did not attack as they recognized you as one of their own. You are the man who vanished through the gate.",
  },
  cube15b: {
    title: "Recognition",
    message:
      "After finishing their story one of the survivors steps forward, pointing at you: 'You are the man who vanished through the gate. You are one of us.",
  },
};

export const cubeEvents: Record<string, GameEvent> = {
  cubeDiscovery: {
    id: "cubeDiscovery",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 2 && !state.relics.whispering_cube,
    timeProbability: 1,
    title: CUBE_EVENT_TEXT.cubeDiscovery.title,
    message: CUBE_EVENT_TEXT.cubeDiscovery.message,
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
      Boolean(
        state.relics.whispering_cube &&
        state.story.seen.venturedDeeper &&
        !state.events.cube01,
      ),
    timeProbability: 1,
    title: CUBE_EVENT_TEXT.cube01.title,
    message: CUBE_EVENT_TEXT.cube01.message,
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
      Boolean(
        state.story.seen.descendedFurther &&
        state.events.cube01 &&
        !state.events.cube02,
      ),
    timeProbability: 1,
    title: CUBE_EVENT_TEXT.cube02.title,
    message: CUBE_EVENT_TEXT.cube02.message,
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
      Boolean(
        state.story.seen.exploredRuins &&
        state.events.cube02 &&
        !state.events.cube03,
      ),
    timeProbability: 1,
    title: CUBE_EVENT_TEXT.cube03.title,
    message: CUBE_EVENT_TEXT.cube03.message,
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
      Boolean(
        state.story.seen.exploredTemple &&
        state.events.cube03 &&
        !state.events.cube04,
      ),
    timeProbability: 1,
    title: CUBE_EVENT_TEXT.cube04.title,
    message: CUBE_EVENT_TEXT.cube04.message,
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
      Boolean(
        state.story.seen.exploredCitadel &&
        state.events.cube04 &&
        !state.events.cube05,
      ),
    timeProbability: 1,
    title: CUBE_EVENT_TEXT.cube05.title,
    message: CUBE_EVENT_TEXT.cube05.message,
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
      Boolean(
        state.story.seen.portalBlasted &&
        state.events.cube05 &&
        !state.events.cube06,
      ),
    timeProbability: 1,
    title: CUBE_EVENT_TEXT.cube06.title,
    message: CUBE_EVENT_TEXT.cube06.message,
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
      Boolean(
        state.story.seen.firstWaveVictory &&
        state.events.cube06 &&
        !state.events.cube07,
      ),
    timeProbability: 1,
    title: CUBE_EVENT_TEXT.cube07.title,
    message: CUBE_EVENT_TEXT.cube07.message,
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
      Boolean(
        state.story.seen.thirdWaveVictory &&
        state.events.cube07 &&
        !state.events.cube08,
      ),
    timeProbability: 1,
    title: CUBE_EVENT_TEXT.cube08.title,
    message: CUBE_EVENT_TEXT.cube08.message,
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
      Boolean(
        state.story.seen.fourthWaveVictory &&
        state.events.cube08 &&
        !state.events.cube09,
      ),
    timeProbability: 0.1,
    title: CUBE_EVENT_TEXT.cube09.title,
    message: CUBE_EVENT_TEXT.cube09.message,
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
      Boolean(
        state.story.seen.sixthWaveVictory &&
        state.events.cube09 &&
        !state.events.cube10,
      ),
    timeProbability: 0.25,
    title: CUBE_EVENT_TEXT.cube10.title,
    message: CUBE_EVENT_TEXT.cube10.message,
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
      Boolean(
        state.story.seen.eighthWaveVictory &&
        state.events.cube10 &&
        !state.events.cube11,
      ),
    timeProbability: 0.25,
    title: CUBE_EVENT_TEXT.cube11.title,
    message: CUBE_EVENT_TEXT.cube11.message,
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

  cube12: {
    id: "cube12",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.tenthWaveVictory &&
        state.events.cube11 &&
        !state.events.cube12,
      ),
    timeProbability: 0.25,
    title: CUBE_EVENT_TEXT.cube12.title,
    message: CUBE_EVENT_TEXT.cube12.message,
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
              cube12: true,
            },
          };
        },
      },
    ],
  },

  cube13: {
    id: "cube13",
    condition: (state: GameState) =>
      Boolean(
        state.story.seen.slaughteredCreatures &&
        state.events.cube12 &&
        !state.events.cube13,
      ),
    timeProbability: 0.02,
    title: CUBE_EVENT_TEXT.cube13.title,
    message: CUBE_EVENT_TEXT.cube13.message,
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
            hasWonAnyGame: true,
          };
        },
      },
    ],
  },

  cube14a: {
    id: "cube14a",
    condition: (state: GameState) =>
      Boolean(
        (state.events.cube13 || state.story.seen.communicatedWithCreatures) &&
        state.events.cube12 &&
        !state.events.cube14a,
      ),
    timeProbability: 0.02,
    title: CUBE_EVENT_TEXT.cube14a.title,
    message: CUBE_EVENT_TEXT.cube14a.message,
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
      Boolean(state.events.cube14a && !state.events.cube14b),
    timeProbability: 0.02,
    title: CUBE_EVENT_TEXT.cube14b.title,
    message: CUBE_EVENT_TEXT.cube14b.message,
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
      Boolean(state.events.cube14b && !state.events.cube14c),
    timeProbability: 0.02,
    title: CUBE_EVENT_TEXT.cube14c.title,
    message: CUBE_EVENT_TEXT.cube14c.message,
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
      Boolean(state.events.cube14c && !state.events.cube14d),
    timeProbability: 0.02,
    title: CUBE_EVENT_TEXT.cube14d.title,
    message: CUBE_EVENT_TEXT.cube14d.message,
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
      Boolean(
        state.events.cube14d &&
        state.story.seen.slaughteredCreatures &&
        !state.events.cube15a,
      ),
    timeProbability: 0.02,
    title: CUBE_EVENT_TEXT.cube15a.title,
    message: CUBE_EVENT_TEXT.cube15a.message,
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
      Boolean(
        state.events.cube14d &&
        state.story.seen.communicatedWithCreatures &&
        !state.events.cube15b,
      ),
    timeProbability: 0.02,
    title: CUBE_EVENT_TEXT.cube15b.title,
    message: CUBE_EVENT_TEXT.cube15b.message,
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
