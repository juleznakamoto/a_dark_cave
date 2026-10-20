import { describe, expect, it } from "vitest";
import {
  cubeHeartbeatBoxShadow,
  heartbeatGlowIntensity,
} from "./cubeHeartbeatGlow";

describe("cube heartbeat glow", () => {
  it("blooms on a thump and rests between them", () => {
    expect(heartbeatGlowIntensity(0.72)).toBeGreaterThan(0.9);
    expect(heartbeatGlowIntensity(0.33)).toBe(0);
  });

  it("wraps a fraction past the end of the loop", () => {
    expect(heartbeatGlowIntensity(1.72)).toBeCloseTo(heartbeatGlowIntensity(0.72), 5);
  });

  it("uses a wider, brighter shadow at full intensity", () => {
    expect(cubeHeartbeatBoxShadow(0)).toBe(
      "0 0 18.0px 2.0px rgba(192, 192, 192, 0.320)",
    );
    expect(cubeHeartbeatBoxShadow(1)).toBe(
      "0 0 28.0px 4.0px rgba(192, 192, 192, 0.480)",
    );
  });
});
