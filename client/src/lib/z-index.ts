/**
 * Z-index scale for consistent layering across the app.
 * Use these constants instead of magic numbers.
 *
 * Hierarchy (low → high):
 * - sleepFog: Sleep-mode mist overlay (covers main panels; below footer and promos)
 * - sleepPromo: Floating invite CTA during sleep (above fog, below footer)
 * - tabHotkeyOverlay: Pause / village hotkey tutorial callout (body-portaled, above buttons)
 * - hoverCalloutUnderModal: Footer callouts (Wishlist on Steam) while a modal is open
 * - gameParticleLayer: Click particles above side panel/tabs/log, below action buttons
 * - dialogOverlay: Modal backdrop. Covers footer callouts. Content stacks above this.
 * - gameActionButtons: Action panel column (estate bars, cooldown buttons)
 * - floatingPromo: Awake-mode floating invite CTA (above action panels; spatially above footer)
 * - hoverCallout: Those same callouts when no modal is open (above the invite)
 * - particles: Body-portaled effects (feed fire, explosions, dialog-adjacent bursts)
 * - tooltip: Tooltips, must appear above dialogs
 * - toast: Update / notification toasts, above hover callouts (Wishlist on Steam)
 * - dropdown: Open menus (footer social), above toasts and hover callouts
 * - dropdownItemTooltip: Tooltips on dropdown rows, above the open menu
 * - topLayer: Full-screen overlays (end screen, start screen CTA)
 */
export const Z_INDEX = {
  /** Sleep mist / pause overlay — covers main content only; action buttons must drop below this while active. */
  sleepFog: 40,
  /** Floating invite button during sleep — above fog, below footer (50). */
  sleepPromo: 45,
  /** Tab hotkey hint/box; must sit above action buttons and their badges. */
  tabHotkeyOverlay: 46,
  /**
   * Footer callouts (Wishlist on Steam, Playlight) while a modal is open.
   * Strictly below `dialogOverlay` (and DemoTimeUp's layerZIndex 50 backdrop at 49).
   */
  hoverCalloutUnderModal: 48,
  /** Fixed overlay in GameContainer `main`; above side panel/tabs/log, below action buttons. */
  gameParticleLayer: 49,
  /** Radix dialog backdrop (`DialogOverlay`). Must cover `hoverCalloutUnderModal`. */
  dialogOverlay: 50,
  /** Action button column in GameContainer; must stay above `gameParticleLayer`. */
  gameActionButtons: 50,
  /** Floating invite CTA while awake — must sit above `gameActionButtons` (estate bars etc.). */
  floatingPromo: 51,
  /**
   * Footer callouts when no modal is open.
   * Above the floating invite, below toasts and menus.
   */
  hoverCallout: 52,
  particles: 1000,
  particlesForeground: 1001,
  tooltip: 10000,
  /** Version-update and other toasts. Above the footer Steam wishlist callout. */
  toast: 10001,
  /** Footer social menu, above toasts and the Steam wishlist callout. */
  dropdown: 10002,
  /** Tooltip on a dropdown row — must paint above the open menu. */
  dropdownItemTooltip: 10003,
  topLayer: 10004,
} as const;
