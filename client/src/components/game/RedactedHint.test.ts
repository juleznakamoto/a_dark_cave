import { describe, expect, it } from "vitest";
import { getRedactedWidthCh } from "./RedactedHint";

describe("getRedactedWidthCh", () => {
  it("uses the real character count of the hidden text", () => {
    expect(getRedactedWidthCh("Village")).toBe(7);
    expect(getRedactedWidthCh("Hi")).toBe(2);
    expect(getRedactedWidthCh("Book of Absolution")).toBe(18);
  });
});
