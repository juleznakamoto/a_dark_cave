import { describe, expect, it } from "vitest";
import { getTimedEventTabLabelKind } from "./timedEventTabLabel";

describe("getTimedEventTabLabelKind", () => {
  it("names merchant visits", () => {
    expect(getTimedEventTabLabelKind({ id: "merchant" })).toBe("merchant");
    expect(getTimedEventTabLabelKind({ id: "merchant-1", eventId: "merchant" })).toBe(
      "merchant",
    );
  });

  it("uses Event for every other timed visit", () => {
    expect(getTimedEventTabLabelKind({ id: "gambler" })).toBe("event");
    expect(getTimedEventTabLabelKind({ id: "feast1" })).toBe("event");
    expect(getTimedEventTabLabelKind({ id: "wandering_collector" })).toBe("event");
    expect(getTimedEventTabLabelKind(null)).toBe("event");
  });
});
