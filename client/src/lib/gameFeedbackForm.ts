/**
 * Hosted Google Form for player feedback (end screen / demo end open it directly;
 * footer and mid-game prompt go through FeedbackDialog).
 */

import { useGameStore } from "@/game/state";

/** Hosted Google Form (`/viewform` public link). */
export const GAME_FEEDBACK_FORM_BASE_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfQzag01E3Vne2ieXdB_s1gL5vZxtmRDX-O0Fsxhrojt9BVAQ/viewform" as const;

export type GameFeedbackFormSource = "footer" | "end" | "dialog" | "demoEnd";

let pendingFeedbackFormSource: GameFeedbackFormSource = "dialog";

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

/** Open {@link FeedbackDialog}; the dialog's form CTA uses this source tag. */
export function openFeedbackDialog(source: GameFeedbackFormSource): void {
  pendingFeedbackFormSource = source;
  useGameStore.setState({ feedbackDialogOpen: true });
}

/** Open the form using the source from the last {@link openFeedbackDialog} call. */
export function openGameFeedbackFormFromDialog(): void {
  openGameFeedbackForm(pendingFeedbackFormSource);
}
