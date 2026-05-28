import { describe, it, expect } from "vitest";
import {
  joinLocaleFileLines,
  parseLocaleJson,
  splitLocaleFileLines,
  stripTrailingLineComment,
} from "./parseLocaleJson";

describe("parseLocaleJson", () => {
  it("parses JSON with trailing line comments", () => {
    const raw = `{
  "combat": {
    "fight": "Kämpfen",  //x1.2
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
      stripTrailingLineComment('  "a": "b",  //x1.5'),
    ).toBe('  "a": "b",');
  });

  it("splitLocaleFileLines drops trailing empty from final newline", () => {
    expect(splitLocaleFileLines('{\n  "a": 1\n}\n')).toEqual(['{', '  "a": 1', '}']);
  });

  it("joinLocaleFileLines adds exactly one trailing newline", () => {
    expect(joinLocaleFileLines(["{", "}"])).toBe("{\n}\n");
  });

  it("split then join is stable for locale files with trailing newline", () => {
    const original = '{\n  "x": "y"\n}\n';
    expect(joinLocaleFileLines(splitLocaleFileLines(original))).toBe(original);
  });

  it("split then join collapses accumulated blank lines at EOF", () => {
    const bloated = '{\n  "x": "y"\n}\n\n\n';
    expect(joinLocaleFileLines(splitLocaleFileLines(bloated))).toBe('{\n  "x": "y"\n}\n');
  });
});
