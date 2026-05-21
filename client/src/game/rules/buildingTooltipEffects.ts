/** Structured building tooltip line resolved via ui.tooltips.buildings.* at render time. */
export type BuildingTooltipEffect = {
  key: string;
  fallback: string;
  options?: Record<string, string | number>;
};

export function bt(
  key: string,
  fallback: string,
  options?: Record<string, string | number>,
): BuildingTooltipEffect {
  return options ? { key, fallback, options } : { key, fallback };
}
