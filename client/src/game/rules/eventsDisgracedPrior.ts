import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const disgracedPriorEvents: Record<string, GameEvent> = {
  disgracedPriorOffer: {
    id: "disgracedPriorOffer",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 6 &&
      !state.fellowship.disgraced_prior &&
      !state.story?.seen?.disgracedPriorJoined,
    timeProbability: 20,
    title: "A Silent Repairman",
    message:
      "Your villagers report a gaunt man in tattered robes quietly repairing the walls of stone huts. He works without speaking, without rest, asking for nothing. When approached, he only says he has much to atone for.",
    priority: 10,
    repeatable: false,
    choices: [
      {
        id: "offerShelter",
        label: "Offer him shelter",
        effect: (state: GameState) => ({
          fellowship: {
            ...state.fellowship,
            disgraced_prior: true,
          },
          disgracedPriorSkills: state.disgracedPriorSkills ?? { level: 0 },
          priorAssignedActions: state.priorAssignedActions ?? [],
          story: {
            ...state.story,
            seen: {
              ...(state.story?.seen ?? {}),
              disgracedPriorJoined: true,
            },
          },
          _logMessage:
            "The prior nods once and follows your villager back to camp. He sets to work immediately, as if he has been waiting for exactly this moment. Disgraced Prior has joined your fellowship.",
        }),
      },
    ],
  },
};
