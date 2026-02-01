import { GameState } from "@shared/schema";
import { LogEntry } from "./events";
import { GAME_CONSTANTS } from "../constants";

/**
 * Check for milestone events that only add log entries
 * These are one-time events that occur when certain conditions are met
 */
export function checkMilestoneLogEntries(state: GameState): Partial<GameState> {
  const modifiedUpdates: Partial<GameState> = {};

  // Check if village reaches 4 villagers for the first time
  const currentPopulation = state.current_population || 0;
  const hasShown4VillagerMilestone = state.story?.seen?.village4VillagersMilestone;

  if (currentPopulation >= 4 && !hasShown4VillagerMilestone) {
    // Add the milestone log entry
    const milestoneEntry: LogEntry = {
      id: "village-4-villagers-milestone",
      message: "A small village begins to take shape. Villagers need food and wood to survive.",
      timestamp: Date.now(),
      type: "system",
    };

    // Update the log and mark the milestone as seen
    modifiedUpdates.log = [
      ...(state.log || []),
      milestoneEntry
    ].slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES);

    modifiedUpdates.story = {
      ...state.story,
      seen: {
        ...state.story?.seen,
        village4VillagersMilestone: true,
      },
    };
  }

  // Check if village reaches 8 villagers for the first time AND blacksmith exists
  const hasShown8VillagerMilestone = state.story?.seen?.village8VillagersMilestone;
  const hasBlacksmith = state.buildings?.blacksmith >= 1;

  if (currentPopulation >= 8 && hasBlacksmith && !hasShown8VillagerMilestone) {
    // Add the milestone log entry
    const milestoneEntry: LogEntry = {
      id: "village-8-villagers-milestone",
      message: "The world is dangerous. Weapons could prove useful to withstand those who want to bring harm to the village.",
      timestamp: Date.now(),
      type: "system",
    };

    // Update the log and mark the milestone as seen
    modifiedUpdates.log = [
      ...(state.log || []),
      milestoneEntry
    ].slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES);

    modifiedUpdates.story = {
      ...state.story,
      seen: {
        ...state.story?.seen,
        village8VillagersMilestone: true,
      },
    };
  }

  return modifiedUpdates;
}