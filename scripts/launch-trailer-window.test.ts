import { describe, expect, it } from "vitest";
import { parseArgs } from "./launch-trailer-window.mjs";

describe("launch-trailer-window parseArgs", () => {
  it("appends --devSave to an explicit URL", () => {
    expect(
      parseArgs(["http://localhost:6000", "--devSave=sleep-active"]).url,
    ).toBe("http://localhost:6000/?devSave=sleep-active");
  });

  it("keeps other query params when adding --devSave", () => {
    expect(
      parseArgs(["http://localhost:6000/?foo=1", "--devSave=village"]).url,
    ).toBe("http://localhost:6000/?foo=1&devSave=village");
  });

  it("lets --devSave replace an existing query value on the URL", () => {
    expect(
      parseArgs([
        "http://localhost:5000/?devSave=village",
        "--devSave=sleep-active",
      ]).url,
    ).toBe("http://localhost:5000/?devSave=sleep-active");
  });

  it("leaves an explicit URL alone when --devSave is omitted", () => {
    expect(parseArgs(["http://localhost:6000/?devSave=village"]).url).toBe(
      "http://localhost:6000/?devSave=village",
    );
  });

  it("still applies --devSave to the constructed localhost URL", () => {
    expect(parseArgs(["--port=5000", "--devSave=bastion"]).url).toBe(
      "http://localhost:5000/?devSave=bastion",
    );
  });
});
