/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GAME_PARTICLE_LAYER_ID } from "@/components/game/gameChrome";
import {
  getGameParticlePortalTarget,
  resolveParticlePortalTarget,
} from "./particlePortal";

describe("particlePortal", () => {
  let layer: HTMLDivElement;

  beforeEach(() => {
    layer = document.createElement("div");
    layer.id = GAME_PARTICLE_LAYER_ID;
    document.body.appendChild(layer);
  });

  afterEach(() => {
    layer.remove();
  });

  it("getGameParticlePortalTarget returns the game layer element", () => {
    expect(getGameParticlePortalTarget()).toBe(layer);
  });

  it("resolveParticlePortalTarget prefers game layer when requested", () => {
    expect(
      resolveParticlePortalTarget({ preferGameLayer: true }),
    ).toBe(layer);
  });

  it("resolveParticlePortalTarget falls back to body when game layer is missing", () => {
    layer.remove();

    expect(
      resolveParticlePortalTarget({ preferGameLayer: true }),
    ).toBe(document.body);
  });

  it("resolveParticlePortalTarget uses an explicit target when provided", () => {
    const custom = document.createElement("div");
    document.body.appendChild(custom);

    expect(
      resolveParticlePortalTarget({ explicitTarget: custom }),
    ).toBe(custom);

    custom.remove();
  });

  it("resolveParticlePortalTarget uses body when explicit target is null", () => {
    expect(
      resolveParticlePortalTarget({ explicitTarget: null }),
    ).toBe(document.body);
  });
});
