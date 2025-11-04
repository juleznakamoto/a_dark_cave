
// Single Source of Truth for cave exploration actions
export const CAVE_EXPLORE_ACTIONS = [
  'exploreCave',
  'ventureDeeper',
  'descendFurther',
  'exploreRuins',
  'exploreTemple',
  'exploreCitadel'
] as const;

export type CaveExploreAction = typeof CAVE_EXPLORE_ACTIONS[number];

export function isCaveExploreAction(actionId: string): actionId is CaveExploreAction {
  return CAVE_EXPLORE_ACTIONS.includes(actionId as CaveExploreAction);
}
