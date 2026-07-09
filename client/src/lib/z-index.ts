/**
 * Z-index scale for consistent layering across the app.
 * Use these constants instead of magic numbers.
 *
 * Hierarchy (low → high):
 * - tabHotkeyOverlay: Pause / village hotkey tutorial callout (body-portaled, above buttons)
 * - gameParticleLayer: In-game click particles (side panel, tabs, log, action panels)
 * - particles: Body-portaled effects (feed fire, explosions, dialog-adjacent bursts)
 * - tooltip: Tooltips, must appear above dialogs
 * - topLayer: Full-screen overlays (end screen, start screen CTA)
 */
export const Z_INDEX = {
  /** Tab hotkey hint/box; must sit above action buttons and their badges. */
  tabHotkeyOverlay: 46,
  /** Fixed shell overlay in GameContainer; CooldownButton click bursts portal here. */
  gameParticleLayer: 49,
  particles: 1000,
  particlesForeground: 1001,
  tooltip: 10000,
  topLayer: 10000,
} as const;
