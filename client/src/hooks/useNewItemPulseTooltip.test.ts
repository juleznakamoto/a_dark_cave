import { describe, expect, it } from "vitest";
import {
  isNewItemPulseActive,
  NEW_ITEM_PULSE_DURATION_MS,
} from "./useNewItemPulseTooltip";

describe("isNewItemPulseActive", () => {
  const startedAt = 1_000_000;

  it("glows before the start time is recorded", () => {
    expect(isNewItemPulseActive(undefined, startedAt)).toBe(true);
  });

  it("glows until the same window as an unread event-log line", () => {
    expect(isNewItemPulseActive(startedAt, startedAt)).toBe(true);
    expect(
      isNewItemPulseActive(
        startedAt,
        startedAt + NEW_ITEM_PULSE_DURATION_MS - 1,
      ),
    ).toBe(true);
    expect(
      isNewItemPulseActive(startedAt, startedAt + NEW_ITEM_PULSE_DURATION_MS),
    ).toBe(false);
  });
});
