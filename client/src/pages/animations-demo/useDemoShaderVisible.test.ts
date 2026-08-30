import { describe, expect, it } from "vitest";
import { pickDemoShaderWinner } from "./useDemoShaderVisible";

describe("pickDemoShaderWinner", () => {
  it("returns null when nothing is in view and hash is empty", () => {
    expect(
      pickDemoShaderWinner([
        { id: "estate-bars", inView: false, top: 20 },
        { id: "attack-waves-bar", inView: false, top: 400 },
      ]),
    ).toBeNull();
  });

  it("picks the only in-view section", () => {
    expect(
      pickDemoShaderWinner([
        { id: "estate-bars", inView: false, top: -200 },
        { id: "attack-waves-bar", inView: true, top: 80 },
      ]),
    ).toBe("attack-waves-bar");
  });

  it("picks the in-view section closest to the top, even if hash names another", () => {
    expect(
      pickDemoShaderWinner(
        [
          { id: "estate-bars", inView: true, top: 40 },
          { id: "attack-waves-bar", inView: true, top: 220 },
        ],
        "attack-waves-bar",
      ),
    ).toBe("estate-bars");
  });

  it("falls back to the hash target before intersection is known", () => {
    expect(
      pickDemoShaderWinner(
        [
          { id: "estate-bars", inView: false, top: 40 },
          { id: "attack-waves-bar", inView: false, top: 220 },
        ],
        "attack-waves-bar",
      ),
    ).toBe("attack-waves-bar");
  });
});
