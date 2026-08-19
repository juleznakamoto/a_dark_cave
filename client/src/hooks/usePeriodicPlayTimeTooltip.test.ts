import { describe, expect, it } from "vitest";
import { getLatestTooltipMilestonePlayMs } from "./usePeriodicPlayTimeTooltip";

const MIN = 60 * 1000;

describe("getLatestTooltipMilestonePlayMs", () => {
  const firstShow = 75 * MIN;
  const interval = 30 * MIN;

  it("returns 0 before the first show", () => {
    expect(getLatestTooltipMilestonePlayMs(firstShow - 1, firstShow, interval)).toBe(
      0,
    );
  });

  it("returns the first milestone at first show", () => {
    expect(getLatestTooltipMilestonePlayMs(firstShow, firstShow, interval)).toBe(
      firstShow,
    );
  });

  it("stays on the current milestone until the next interval", () => {
    expect(
      getLatestTooltipMilestonePlayMs(firstShow + interval - 1, firstShow, interval),
    ).toBe(firstShow);
  });

  it("advances every interval after the first show", () => {
    expect(
      getLatestTooltipMilestonePlayMs(firstShow + interval, firstShow, interval),
    ).toBe(firstShow + interval);
    expect(
      getLatestTooltipMilestonePlayMs(firstShow + 2 * interval, firstShow, interval),
    ).toBe(firstShow + 2 * interval);
  });

  it("uses 60 min first then every 30 min for Steam", () => {
    const steamFirst = 60 * MIN;
    expect(getLatestTooltipMilestonePlayMs(steamFirst, steamFirst, interval)).toBe(
      steamFirst,
    );
    expect(
      getLatestTooltipMilestonePlayMs(steamFirst + interval, steamFirst, interval),
    ).toBe(90 * MIN);
  });
});
