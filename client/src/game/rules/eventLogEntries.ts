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

  return modifiedUpdates;
}