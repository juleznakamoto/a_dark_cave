import { describe, expect, it } from "vitest";
import { builderPlatforms } from "./package-steam-edition.mjs";

describe("package-steam-edition builderPlatforms", () => {
  it("defaults to Windows only", () => {
    expect(builderPlatforms([])).toEqual(["win"]);
  });

  it("builds only Linux with --linux", () => {
    expect(builderPlatforms(["--linux"])).toEqual(["linux"]);
  });

  it("builds both with --win --linux", () => {
    expect(builderPlatforms(["--linux", "--win"])).toEqual(["win", "linux"]);
  });
});
