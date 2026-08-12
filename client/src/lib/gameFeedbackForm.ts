/**
 * Hosted Google Form for player feedback (footer / end screen / demo end open it
 * directly; mid-game prompt goes through FeedbackDialog).
 *
 * Keep this module free of a static `@/game/state` import. StartScreen uses
 * {@link openGameFeedbackForm}; a static store import would pull the full game
 * engine onto the cold-start critical path.
 *
 * Dialog open lives in {@link ./openFeedbackDialog} (sync store write).
 */

/** Hosted Google Form (`/viewform` public link). */
export const GAME_FEEDBACK_FORM_BASE_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfQzag01E3Vne2ieXdB_s1gL5vZxtmRDX-O0Fsxhrojt9BVAQ/viewform" as const;

export type GameFeedbackFormSource = "footer" | "end" | "dialog" | "demoEnd";

let pendingFeedbackFormSource: GameFeedbackFormSource = "dialog";

/** Remember which CTA opened FeedbackDialog (used by the dialog form button). */
export function rememberFeedbackFormSource(
  source: GameFeedbackFormSource,
): void {
  pendingFeedbackFormSource = source;
}

/** Build the form URL with a source tag (ignored by Google Forms; useful if you wrap the link later). */
export function getGameFeedbackFormUrl(
  source: GameFeedbackFormSource,
): string {
  const url = new URL(GAME_FEEDBACK_FORM_BASE_URL);
  url.searchParams.set("adc_source", source);
  return url.toString();
}

/** Open the feedback form in the system / Steam overlay browser. */
export function openGameFeedbackForm(source: GameFeedbackFormSource): void {
  window.open(getGameFeedbackFormUrl(source), "_blank", "noopener,noreferrer");
}

/** Open the form using the source from the last {@link rememberFeedbackFormSource} call. */
export function openGameFeedbackFormFromDialog(): void {
  openGameFeedbackForm(pendingFeedbackFormSource);
}
