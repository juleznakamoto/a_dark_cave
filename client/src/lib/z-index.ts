/**
 * Z-index scale for consistent layering across the app.
 * Use these constants instead of magic numbers.
 *
 * Hierarchy (low → high):
 * - tabHotkeyOverlay: Pause / village hotkey tutorial callout (body-portaled, above buttons)
 * - gameParticleLayer: Click particles above side panel/tabs/log, below action buttons
 * - particles: Body-portaled effects (feed fire, explosions, dialog-adjacent bursts)
 * - tooltip: Tooltips, must appear above dialogs
 * - topLayer: Full-screen overlays (end screen, start screen CTA)
 */
export const Z_INDEX = {
  /** Tab hotkey hint/box; must sit above action buttons and their badges. */
  tabHotkeyOverlay: 46,
  /** Fixed overlay in GameContainer `main`; above side panel/tabs/log, below action buttons. */
  gameParticleLayer: 49,
  /** Action button column in GameContainer; must stay above `gameParticleLayer`. */
  gameActionButtons: 50,
  particles: 1000,
  particlesForeground: 1001,
  tooltip: 10000,
  topLayer: 10000,
} as const;
