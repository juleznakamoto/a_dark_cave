import { describe, it, expect } from "vitest";
import { parseLocaleJson, stripTrailingLineComment } from "./parseLocaleJson";

describe("parseLocaleJson", () => {
  it("parses JSON with trailing line comments", () => {
    const raw = `{
  "combat": {
    "fight": "Kämpfen",  //1.2X
    "defense": "Verteidigung"  //ok fits dialog button
  }
}`;
    expect(parseLocaleJson(raw)).toEqual({
      combat: {
        fight: "Kämpfen",
        defense: "Verteidigung",
      },
    });
  });

  it("does not strip // inside string values", () => {
    const raw = `{ "hint": "Use //ok in comments only" }`;
    expect(parseLocaleJson(raw)).toEqual({
      hint: "Use //ok in comments only",
    });
  });

  it("stripTrailingLineComment preserves code portion", () => {
    expect(
      stripTrailingLineComment('  "a": "b",  //1.5X'),
    ).toBe('  "a": "b",');
  });
});
