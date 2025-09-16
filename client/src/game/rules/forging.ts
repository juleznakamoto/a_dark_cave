
import { Action } from "@shared/schema";

export const forgingActions: Record<string, Action> = {
  forgSteel: {
    id: "forgSteel",
    label: "Steel",
    show_when: {
      "story.seen.hasCoal": true,
      "story.seen.hasIron": true,
    },
    cost: {
      "resources.coal": 5,
      "resources.iron": 5,
    },
    effects: {
      "resources.coal": -5,
      "resources.iron": -5,
      "resources.steel": 1,
      "story.seen.hasSteel": true,
    },
    cooldown: 10,
  },
};
