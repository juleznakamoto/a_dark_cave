/**
 * Preset slots unlocked per archive building tier (Scribe's, Records, Grand Archive).
 *
 * Kept in its own file so building-action tooltips do not import
 * `villagerJobPresets`. That module loads population and the game store,
 * which register actions before `villageBuildActions` has finished initializing.
 */
export const PRESET_SLOTS_BY_BUILDING_TIER = [2, 1, 2] as const;
