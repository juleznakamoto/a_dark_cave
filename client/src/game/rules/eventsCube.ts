import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const cubeEvents: Record<string, GameEvent> = {
  cubeDiscovery: {
    id: "cubeDiscovery",
    condition: (state: GameState) =>
      state.flags.hasVillagers && !state.relics.murmuring_cube,
    triggerType: "resource",
    timeProbability: 2,
    title: "The Murmuring Cube",
    message:
      "Near the cave’s entrance, you discover a perfectly polished metal cube. At first it seems still, but then you feel a faint vibration beneath your fingers — a slow, rhythmic pulse, almost like a heartbeat.",
    triggered: false,
    priority: 3,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        relics: {
          ...state.relics,
          murmuring_cube: true,
        },
      };
    },
  },

  cube01: {
    id: "cube01",
    condition: (state: GameState) =>
      state.story.seen.venturedDeeper && !state.events.cube01,
    triggerType: "resource",
    timeProbability: 2,
    title: "The Cube awakens",
    message:
      "You wake up in the middle of the night. The cube hums softly beside you. A gentle, melodic voice emerges from within, whispering: 'Once there was a great civilization, but something caused it to fall apart. Ancient knowledge has long since been lost.",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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
    timeProbability: 2,
    title: "The warrior tribe",
    message:
      "'Long ago, a tribe of fierce warriors was chosen to dwell deep within the caves. Their purpose was to guard something of great importance.'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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
    timeProbability: 2,
    title: "The underground city",
    message:
      "'The warrior tribe grew into a vast underground city, safe from the world above, still protecting what they were sent to protect many lifetimes ago.'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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
    timeProbability: 2,
    title: "The sacred oath",
    message:
      "'Though the memory of what they protected has faded into legend, their vigilance endures. For countless generations they have kept their sacred oath, watching over what lies at the city’s deepest point.'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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
    timeProbability: 2,
    title: "The sealed portal",
    message:
      "'Long after the warriors perished, the object of their devotion remained: a colossal, impenetrable portal, crafted with long-forgotten, advanced technology, hidden deep within the city’s lowest chambers'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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
      "As the portal is blasted open, the cube trembles violently in your hands, growing warm to the touch. A soft, urgent murmur escapes it: 'I have gained new insights…'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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
    timeProbability: 2,
    title: "Ancient technology",
    message:
      "'The ancient civilization that forged the portal possessed knowledge far beyond the current age. They crafted devices designed to be implanted within the skull, enhancing both mind and body'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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
    timeProbability: 2,
    title: "The golden age",
    message:
      "'The leaders decreed that every citizen must bear a device. Yet a small faction began to voice their concerns, forming a secret resistance as they recognized the dangers hidden within the technology.'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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
    timeProbability: 2,
    title: "The golden age",
    message:
      "'With the aid of the devices, the civilization thrived. An era of unprecedented peace and progress began, their knowledge and skill reaching heights that would never be seen again.'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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

  cube10: {
    id: "cube10",
    condition: (state: GameState) =>
      state.story.seen.fourthWaveVictory &&
      state.events.cube09 &&
      !state.events.cube10,
    triggerType: "resource",
    timeProbability: 2,
    title: "The great collapse",
    message:
      "'One day, without warning, an unimaginable magneto-electric wave swept across the globe. Every device of the civilization, including those embedded within the skulls, was obliterated in an instant.'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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
    timeProbability: 2,
    title: "End of civilization",
    message:
      "'The survivors could not endure without the technology. Many died. Civilization regressed, its knowledge and inventions slipping into oblivion. Nature reclaimed the lands, leaving only buried ruins where greatness once stood.'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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
    timeProbability: 2,
    title: "Recovered data",
    message:
      "The cube pulses with a strange energy as you approach the bodies of the slain creatures. It seems to extract information from somewhere, fragments of data preserved through the centuries. The cube grows warm, processing the recovered knowledge from the depths of the cave.",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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
    timeProbability: 1,
    title: "The resistance",
    message:
      "'When the leaders of the ancient civilization imposed the skull devices, a resistance arose. They were cast into the mountain’s depths, forbidden to leave. With no path back, they tunneled ever deeper. Over generations, isolation and darkness eroded their minds, and slowly they descended into madness and degeneration.'",
    triggered: false,
    priority: 3,
    repeatable: false,
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
      "'One day, far beneath the earth, they discovered a monolith of unknown ore. After desperate experimentation, they fashioned it into a device meant to destroy the portal. The bomb failed to breach the gate, but unleashed an immense electro-magnetic pulse.'",
    triggered: false,
    priority: 3,
    repeatable: false,
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
      "'Shortly after the explosion, one man who stood too close began to dematerialize — his form flickering, partially see-through for fleeting moments. Moments later, scared and driven mad by what he had witnessed, he took his own life.'",
    triggered: false,
    priority: 3,
    repeatable: false,
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

  cube14d: {
    id: "cube14d",
    condition: (state: GameState) =>
      state.events.cube14c && !state.events.cube14d,
    triggerType: "resource",
    timeProbability: 0.001,
    title: "Through the portal",
    message:
      "'In their despair, the survivors theorized that, with the ore's aid, they might pass through solid metal, maybe even the portal itself. Using the last fragments of the material, they crafted a smaller device and positioned their healthiest, sanest man before the gate. For a fleeting instant after the detonation, he appeared ghostly, translucent, and then vanished entirely into the portal, leaving no trace behind.'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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
    timeProbability: 1,
    title: "Recognition",
    message:
      "That was when you recognize that the creatures did not attack as they recognized you as the man who vanished through the portal.",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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
    timeProbability: 1,
    title: "Recognition",
    message:
      "They recognize you as the man who vanished through the portal.",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acknowledge_vision",
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