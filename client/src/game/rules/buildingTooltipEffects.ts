/** Structured building tooltip line resolved via ui.tooltips.buildings.* at render time. */
export type BuildingTooltipEffect = {
  key: string;
  fallback: string;
  options?: Record<string, string | number>;
  /** Show on every tier in an upgrade chain, not only when the line first appears. */
  repeatEveryLevel?: boolean;
};

export function bt(
  key: string,
  fallback: string,
  options?: Record<string, string | number>,
): BuildingTooltipEffect {
  return options ? { key, fallback, options } : { key, fallback };
}
