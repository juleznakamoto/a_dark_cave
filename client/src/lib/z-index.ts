/**
 * Z-index scale for consistent layering across the app.
 * Use these constants instead of magic numbers.
 *
 * Hierarchy (low → high):
 * - actionButtonParticles: Click bursts above tab bar, below buttons
 * - actionButtons: Fixed action button stacks
 * - particles: Transient particle effects (feed fire, explosions)
 * - tooltip: Tooltips, must appear above dialogs
 * - topLayer: Full-screen overlays (end screen, start screen CTA)
 */
export const Z_INDEX = {
  /** Click bursts above tab bar / panel chrome, below action buttons. */
  actionButtonParticles: 35,
  /** Fixed-position action button stacks (above actionButtonParticles). */
  actionButtons: 40,
  particles: 1000,
  particlesForeground: 1001,
  tooltip: 10000,
  topLayer: 10000,
} as const;
