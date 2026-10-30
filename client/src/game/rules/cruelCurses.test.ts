import { describe, expect, it } from "vitest";
import { sanitizeChosenCruelCurses } from "./cruelCurses";

describe("sanitizeChosenCruelCurses", () => {
  it("keeps known ids in offer order and drops the rest", () => {
    expect(
      sanitizeChosenCruelCurses([
        "loud_omens",
        "nope",
        "ashen_harvest",
        "loud_omens",
        3,
      ]),
    ).toEqual(["ashen_harvest", "loud_omens"]);
  });

  it("returns an empty list for missing input", () => {
    expect(sanitizeChosenCruelCurses(undefined)).toEqual([]);
  });
});
