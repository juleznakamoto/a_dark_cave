import { describe, expect, it } from "vitest";
import {
  MAKE_FIRE_HANDOFF_SPINNER_DELAY_MS,
  shouldHoldMakeFireFrame,
} from "./makeFireHandoff";

describe("shouldHoldMakeFireFrame", () => {
  it("holds the title frame only during a Make Fire wait under the delay", () => {
    expect(
      shouldHoldMakeFireFrame({
        fromMakeFire: true,
        gameReadyToPaint: false,
        spinnerDelayElapsed: false,
      }),
    ).toBe(true);
  });

  it("drops the frame once Game can paint (fast path)", () => {
    expect(
      shouldHoldMakeFireFrame({
        fromMakeFire: true,
        gameReadyToPaint: true,
        spinnerDelayElapsed: false,
      }),
    ).toBe(false);
  });

  it("drops the frame after the delay so the spinner can show (slow path)", () => {
    expect(
      shouldHoldMakeFireFrame({
        fromMakeFire: true,
        gameReadyToPaint: false,
        spinnerDelayElapsed: true,
      }),
    ).toBe(false);
  });

  it("never holds the title for a returning-player game boot", () => {
    expect(
      shouldHoldMakeFireFrame({
        fromMakeFire: false,
        gameReadyToPaint: false,
        spinnerDelayElapsed: false,
      }),
    ).toBe(false);
  });

  it("uses a short delay so a real wait still shows a spinner", () => {
    expect(MAKE_FIRE_HANDOFF_SPINNER_DELAY_MS).toBe(250);
  });
});
