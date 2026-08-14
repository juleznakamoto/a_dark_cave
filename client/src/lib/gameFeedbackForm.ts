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

/** button_clicks id written when the hosted form opens from this source. */
export function feedbackFormButtonId(source: GameFeedbackFormSource): string {
  // Preserve the historical end-screen analytics id.
  if (source === "end") return "end-screen-feedback";
  return `feedback-open-${source}`;
}

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

/**
 * Record who opened the form (button_clicks + wall-clock stamp on the save).
 * Dynamic import so StartScreen does not pull the game engine until click.
 */
function trackFeedbackFormOpen(source: GameFeedbackFormSource): void {
  void import("@/game/state")
    .then(({ useGameStore }) => {
      useGameStore.getState().trackButtonClick(feedbackFormButtonId(source));
      useGameStore.setState({
        lastFeedbackOpenedAt: Date.now(),
        lastFeedbackOpenedSource: source,
      });
    })
    .catch(() => {
      // Opening the form must not fail if analytics is unavailable.
    });
}

/** Open the feedback form in the system / Steam overlay browser. */
export function openGameFeedbackForm(source: GameFeedbackFormSource): void {
  window.open(getGameFeedbackFormUrl(source), "_blank", "noopener,noreferrer");
  trackFeedbackFormOpen(source);
}

/** Open the form using the source from the last {@link rememberFeedbackFormSource} call. */
export function openGameFeedbackFormFromDialog(): void {
  openGameFeedbackForm(pendingFeedbackFormSource);
}
