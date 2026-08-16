import { describe, expect, it } from "vitest";
import { publicUrl, publicUrlMap } from "./publicUrl";

describe("publicUrl", () => {
  it("leaves root-absolute paths unchanged when Vite base is /", () => {
    expect(publicUrl("/sounds/wind.mp3")).toBe("/sounds/wind.mp3");
  });

  it("leaves already-relative paths unchanged", () => {
    expect(publicUrl("sounds/wind.mp3")).toBe("sounds/wind.mp3");
  });

  it("maps every value in a sound table", () => {
    expect(
      publicUrlMap({
        wind: "/sounds/wind.mp3",
        fire: "/sounds/light_fire.mp3",
      }),
    ).toEqual({
      wind: "/sounds/wind.mp3",
      fire: "/sounds/light_fire.mp3",
    });
  });
});
