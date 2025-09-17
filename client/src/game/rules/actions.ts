
import { Action } from "@shared/schema";

export const basicActions: Record<string, Action> = {
  lightFire: {
    id: "lightFire",
    label: "Light Fire",
    show_when: { "flags.fireLit": false },
    cost: {},
    effects: {
      "flags.fireLit": true,
      "story.seen.fireLit": true,
    },
    cooldown: 1,
  },

  gatherWood: {
    id: "gatherWood",
    label: "Gather Wood",
    show_when: {
      "flags.fireLit": true,
    },
    cost: {},
    effects: {
      "resources.wood": "random(1,400)",
      "story.seen.hasWood": true,
      "events.trinket_found": {
        probability: 0.0005,
        value: true,
        condition: "!events.trinket_found && buildings.cabin >= 1",
        triggerEvent: "trinketFound",
      },
    },
    cooldown: 5,
  },
};
