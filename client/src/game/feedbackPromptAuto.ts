/** One-time feedback dialog after this much active play time (ms). */
export const FEEDBACK_PROMPT_PLAY_MS = 60 * 60 * 1000;

/** Skip auto-open for saves that already passed the milestone before the dialog shipped. */
export function feedbackPromptAlreadyDueFromPlayTime(playTimeMs: number): boolean {
  return playTimeMs >= FEEDBACK_PROMPT_PLAY_MS;
}
