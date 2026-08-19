/**
 * Z-index scale for consistent layering across the app.
 * Use these constants instead of magic numbers.
 *
 * Hierarchy (low → high):
 * - sleepFog: Sleep-mode mist overlay (covers main panels; below footer and promos)
 * - sleepPromo: Floating invite CTA during sleep (above fog, below footer)
 * - tabHotkeyOverlay: Pause / village hotkey tutorial callout (body-portaled, above buttons)
 * - gameParticleLayer: Click particles above side panel/tabs/log, below action buttons
 * - gameActionButtons: Action panel column (estate bars, cooldown buttons)
 * - floatingPromo: Awake-mode floating invite CTA (above action panels; spatially above footer)
 * - particles: Body-portaled effects (feed fire, explosions, dialog-adjacent bursts)
 * - tooltip: Tooltips, must appear above dialogs
 * - dropdown: Open menus (footer social) — above hover callouts
 * - dropdownItemTooltip: Tooltips on dropdown rows — above the open menu
 * - topLayer: Full-screen overlays (end screen, start screen CTA)
 */
export const Z_INDEX = {
  /** Sleep mist / pause overlay — covers main content only; action buttons must drop below this while active. */
  sleepFog: 40,
  /** Floating invite button during sleep — above fog, below footer (50). */
  sleepPromo: 45,
  /** Tab hotkey hint/box; must sit above action buttons and their badges. */
  tabHotkeyOverlay: 46,
  /** Fixed overlay in GameContainer `main`; above side panel/tabs/log, below action buttons. */
  gameParticleLayer: 49,
  /** Action button column in GameContainer; must stay above `gameParticleLayer`. */
  gameActionButtons: 50,
  /** Floating invite CTA while awake — must sit above `gameActionButtons` (estate bars etc.). */
  floatingPromo: 51,
  particles: 1000,
  particlesForeground: 1001,
  tooltip: 10000,
  /** Footer social menu — above the Steam wishlist callout. */
  dropdown: 10001,
  /** Tooltip on a dropdown row — must paint above the open menu. */
  dropdownItemTooltip: 10002,
  topLayer: 10000,
} as const;
