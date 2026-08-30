import { describe, expect, it } from "vitest";
import {
  getDemoTeaserTabRedactedWidthCh,
  isDemoTeaserTab,
  shouldShowDemoLockedTab,
} from "./demoTeaserTabs";

describe("demoTeaserTabs", () => {
  it("treats location tabs as demo teasers", () => {
    expect(isDemoTeaserTab("village")).toBe(true);
    expect(isDemoTeaserTab("forest")).toBe(true);
    expect(isDemoTeaserTab("estate")).toBe(true);
    expect(isDemoTeaserTab("bastion")).toBe(true);
    expect(isDemoTeaserTab("cave")).toBe(false);
    expect(isDemoTeaserTab("achievements")).toBe(false);
  });

  it("shows a locked placeholder only in the demo", () => {
    expect(
      shouldShowDemoLockedTab({ demoEditionActive: true, unlocked: false }),
    ).toBe(true);
    expect(
      shouldShowDemoLockedTab({ demoEditionActive: true, unlocked: true }),
    ).toBe(false);
    expect(
      shouldShowDemoLockedTab({ demoEditionActive: false, unlocked: false }),
    ).toBe(false);
  });

  it("sizes the redacted bar from the hidden label", () => {
    expect(getDemoTeaserTabRedactedWidthCh("Village")).toBe(7);
    expect(getDemoTeaserTabRedactedWidthCh("Hi")).toBe(2);
    expect(getDemoTeaserTabRedactedWidthCh("FortressName")).toBe(12);
  });
});
