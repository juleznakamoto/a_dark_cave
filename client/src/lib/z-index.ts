/**
 * Z-index scale for consistent layering across the app.
 * Use these constants instead of magic numbers.
 *
 * Hierarchy (low → high):
 * - particles: Transient particle effects (fire, explosions)
 * - tooltip: Tooltips, must appear above dialogs
 * - topLayer: Full-screen overlays (end screen, start screen CTA)
 */
export const Z_INDEX = {
  particles: 1000,
  particlesForeground: 1001,
  tooltip: 10000,
  topLayer: 10000,
} as const;
