/**
 * Z-index scale for consistent layering across the app.
 * Use these constants instead of magic numbers.
 *
 * Hierarchy (low → high):
 * - actionButtonParticles: Shared click bursts behind action buttons (in-panel layer)
 * - tabHotkeyOverlay: Pause / village hotkey tutorial callout (body-portaled, above buttons)
 * - particles: Transient particle effects (feed fire, explosions)
 * - tooltip: Tooltips, must appear above dialogs
 * - topLayer: Full-screen overlays (end screen, start screen CTA)
 */
export const Z_INDEX = {
  /** Shared action-button click bursts — below GAME_ACTION_BUTTON_STACK_CLASS (z-20). */
  actionButtonParticles: 10,
  /** Tab hotkey hint/box; must sit above action buttons and their badges. */
  tabHotkeyOverlay: 46,
  particles: 1000,
  particlesForeground: 1001,
  tooltip: 10000,
  topLayer: 10000,
} as const;
