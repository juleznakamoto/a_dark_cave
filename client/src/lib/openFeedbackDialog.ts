/**
 * Game-path helper to open FeedbackDialog. Lives outside {@link ./gameFeedbackForm}
 * so StartScreen can import URL helpers without a static `@/game/state` edge.
 */
import { useGameStore } from "@/game/state";
import {
  rememberFeedbackFormSource,
  type GameFeedbackFormSource,
} from "@/lib/gameFeedbackForm";

/** Open {@link FeedbackDialog}; the dialog's form CTA uses this source tag. */
export function openFeedbackDialog(source: GameFeedbackFormSource): void {
  rememberFeedbackFormSource(source);
  useGameStore.setState({ feedbackDialogOpen: true });
}
