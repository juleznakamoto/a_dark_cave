/** Hold the last Make Fire frame this long before revealing the load spinner. */
export const MAKE_FIRE_HANDOFF_SPINNER_DELAY_MS = 250;

/**
 * After Make Fire, keep the title frame up until Game can paint.
 * If that wait exceeds the delay, drop the frame so the spinner can show.
 * Returning-player boots (`fromMakeFire` false) never hold the title.
 */
export function shouldHoldMakeFireFrame(input: {
  fromMakeFire: boolean;
  gameReadyToPaint: boolean;
  spinnerDelayElapsed: boolean;
}): boolean {
  return (
    input.fromMakeFire &&
    !input.gameReadyToPaint &&
    !input.spinnerDelayElapsed
  );
}
