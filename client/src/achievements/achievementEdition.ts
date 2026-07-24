import { isSteamEditionActive } from "@/lib/edition";
import type { AchievementChartConfig, AchievementSegment } from "./achievementTypes";

/** True when this segment should appear for the given edition filter. */
export function isAchievementSegmentVisible(
  segment: Pick<AchievementSegment, "webOnly">,
  excludeWebOnly: boolean,
): boolean {
  return !(excludeWebOnly && segment.webOnly);
}

/**
 * Drop `webOnly` segments (and empty rings) when `excludeWebOnly` is set.
 * Returns the same config reference when nothing changes.
 */
export function filterWebOnlyAchievements(
  config: AchievementChartConfig,
  excludeWebOnly: boolean,
): AchievementChartConfig {
  if (!excludeWebOnly) return config;

  let changed = false;
  const rings: AchievementSegment[][] = [];
  for (const ring of config.rings) {
    const kept = ring.filter((seg) => isAchievementSegmentVisible(seg, true));
    if (kept.length !== ring.length) changed = true;
    if (kept.length > 0) rings.push(kept);
    else if (ring.length > 0) changed = true;
  }
  if (!changed) return config;
  return { ...config, rings };
}

/** Config for the current runtime edition (Steam Game Mode / Steam build strips web-only). */
export function getAchievementConfigForEdition(
  config: AchievementChartConfig,
): AchievementChartConfig {
  return filterWebOnlyAchievements(config, isSteamEditionActive());
}

/** Steam partner / sync list — never includes web-only achievements. */
export function getAchievementConfigForSteam(
  config: AchievementChartConfig,
): AchievementChartConfig {
  return filterWebOnlyAchievements(config, true);
}
