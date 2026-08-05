/**
 * CSS animation / effect classes used in the game UI.
 *
 * Keep this list aligned with `client/src/index.css` keyframe wrappers that are
 * still applied as class names (not owned by a dedicated React component).
 * Prefer demoing via the real component when one exists (e.g. ImproveButton).
 */
export type CssEffectDemo = {
  id: string;
  label: string;
  /** Class(es) applied to the sample element. */
  className: string;
  /** How the playground triggers the effect. */
  mode: "loop" | "replay" | "hover";
  /** Optional sample text / glyph. */
  sample?: string;
};

export const CSS_EFFECT_DEMOS: CssEffectDemo[] = [
  {
    id: "tab-blink-new",
    label: "Tab blink (new)",
    className: "tab-blink-new",
    mode: "replay",
    sample: "New tab",
  },
  {
    id: "tab-fade-in",
    label: "Tab fade-in",
    className: "tab-fade-in",
    mode: "replay",
    sample: "Unlocked",
  },
  {
    id: "social-task-check",
    label: "Social task check",
    className: "social-task-check-animate",
    mode: "replay",
    sample: "✓",
  },
  {
    id: "new-item-pulse",
    label: "New item pulse",
    className: "new-item-pulse text-amber-400",
    mode: "loop",
    sample: "● New",
  },
  {
    id: "resource-critical",
    label: "Resource critical",
    className: "resource-critical-blink text-red-500",
    mode: "loop",
    sample: "0 wood",
  },
  {
    id: "fire-active",
    label: "Fire text",
    className: "fire-active",
    mode: "loop",
    sample: "Feed Fire",
  },
  {
    id: "madness-light",
    label: "Madness light",
    className: "madness-pulse-light",
    mode: "loop",
    sample: "Madness",
  },
  {
    id: "madness-medium",
    label: "Madness medium",
    className: "madness-pulse-medium",
    mode: "loop",
    sample: "Madness",
  },
  {
    id: "madness-intense",
    label: "Madness intense",
    className: "madness-pulse-intense",
    mode: "loop",
    sample: "Madness",
  },
  {
    id: "madness-extreme",
    label: "Madness extreme",
    className: "madness-pulse-extreme",
    mode: "loop",
    sample: "Madness",
  },
  {
    id: "cube-dialog-glow",
    label: "Cube dialog glow",
    className: "cube-dialog-glow opacity-40",
    mode: "loop",
    sample: "▣",
  },
  {
    id: "madness-dialog-glow",
    label: "Madness dialog glow",
    className: "madness-dialog-glow opacity-50",
    mode: "loop",
    sample: "◈",
  },
  {
    id: "defeat-text-pulse",
    label: "Defeat text",
    className: "defeat-text-pulse text-red-700 uppercase tracking-[0.25em]",
    mode: "loop",
    sample: "You Lost",
  },
  {
    id: "notification-pulse",
    label: "Notification pulse",
    className: "notification-pulse text-lime-400",
    mode: "loop",
    sample: "●",
  },
  {
    id: "explore-fun-games-cue",
    label: "Explore fun games cue",
    className: "explore-fun-games-cue text-muted-foreground",
    mode: "loop",
    sample: "Fun Games",
  },
  {
    id: "continue-pause-flash",
    label: "Continue / pause flash",
    className: "continue-pause-flash",
    mode: "loop",
    sample: "Continue",
  },
  {
    id: "invite-friends-float",
    label: "Invite friends float",
    className: "invite-friends-float",
    mode: "loop",
    sample: "Invite",
  },
  {
    id: "timer-tab-pulse",
    label: "Timer tab pulse",
    className: "timer-tab-pulse",
    mode: "loop",
    sample: "⏱",
  },
  {
    id: "timer-tab-pulse-green",
    label: "Timer tab green",
    className: "timer-tab-pulse-green",
    mode: "loop",
    sample: "⏱",
  },
  {
    id: "timer-tab-pulse-red",
    label: "Timer tab red",
    className: "timer-tab-pulse-red",
    mode: "loop",
    sample: "⏱",
  },
  {
    id: "compass-glow",
    label: "Compass glow",
    className: "compass-glow",
    mode: "replay",
    sample: "Compass",
  },
  {
    id: "focus-glow",
    label: "Focus glow (active)",
    className: "focus-glow",
    mode: "loop",
    sample: "Focus",
  },
  {
    id: "focus-glow-hover",
    label: "Focus glow (hover)",
    className: "focus-glow-hover",
    mode: "hover",
    sample: "Focus",
  },
  {
    id: "gambler-goal-blink",
    label: "Gambler goal blink",
    className: "gambler-goal-blink-3",
    mode: "replay",
    sample: "Goal",
  },
  {
    id: "button-glow",
    label: "Button glow",
    className: "button-glow-animation",
    mode: "loop",
    sample: "Glow",
  },
  {
    id: "overlay-fade-in",
    label: "Overlay fade-in",
    className: "overlay-fade-in",
    mode: "replay",
    sample: "Overlay",
  },
  {
    id: "blood-moon-smoke-fade-in",
    label: "Blood moon smoke fade",
    className: "blood-moon-smoke-fade-in",
    mode: "replay",
    sample: "Smoke",
  },
  {
    id: "animate-fade-in",
    label: "Fade in",
    className: "animate-fade-in",
    mode: "replay",
    sample: "Fade",
  },
  {
    id: "animate-fade-out-up",
    label: "Fade out up",
    className: "animate-fade-out-up",
    mode: "replay",
    sample: "Up",
  },
  {
    id: "log-fade-out",
    label: "Log fade out",
    className: "log-fade-out",
    mode: "replay",
    sample: "Log line",
  },
];
