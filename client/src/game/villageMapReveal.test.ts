import { describe, expect, it } from "vitest";
import {
  diffVillageMapReveal,
  hasUnseenVillageMapMarks,
  holdRevealForMapOpen,
  revealForMapChange,
  revealForSimulatedOpen,
  villageMapFeatureMarks,
} from "@/game/villageMapReveal";

describe("village map reveal", () => {
  it("fades in a building the map has not shown yet", () => {
    const reveal = diffVillageMapReveal(
      [{ id: "woodenHut:0", tier: 1 }, { id: "woodenHut:1", tier: 1 }],
      {},
    );
    expect(reveal.fadeIn).toEqual({ "woodenHut:0": true, "woodenHut:1": true });
    expect(reveal.fadeOutTier).toEqual({});
  });

  it("leaves buildings that were already shown alone", () => {
    const reveal = diffVillageMapReveal(
      [{ id: "woodenHut:0", tier: 1 }],
      { "woodenHut:0": 1 },
    );
    expect(reveal.fadeIn).toEqual({});
    expect(reveal.fadeOutTier).toEqual({});
  });

  it("fades an upgrade out of the old tier and into the new one", () => {
    const reveal = diffVillageMapReveal(
      [{ id: "coinhouse:0", tier: 3 }, { id: "woodenHut:0", tier: 1 }],
      { "coinhouse:0": 1, "woodenHut:0": 1 },
    );
    expect(reveal.fadeIn).toEqual({ "coinhouse:0": true });
    expect(reveal.fadeOutTier).toEqual({ "coinhouse:0": 1 });
  });

  it("fades in only the new copy of a stack", () => {
    const reveal = diffVillageMapReveal(
      [
        { id: "woodenHut:0", tier: 1 },
        { id: "woodenHut:1", tier: 1 },
        { id: "woodenHut:2", tier: 1 },
      ],
      { "woodenHut:0": 1, "woodenHut:1": 1 },
    );
    expect(reveal.fadeIn).toEqual({ "woodenHut:2": true });
    expect(reveal.fadeOutTier).toEqual({});
  });

  it("fades a building that finishes while the map is already open", () => {
    const open = revealForMapChange(null, [{ id: "woodenHut:0", tier: 1 }], {});
    expect(open.reveal.fadeIn).toEqual({ "woodenHut:0": true });
    const finished = revealForMapChange(
      open.reveal,
      [
        { id: "woodenHut:0", tier: 1 },
        { id: "blacksmith:0", tier: 1 },
      ],
      open.shown,
    );
    expect(finished.reveal.fadeIn).toEqual({
      "woodenHut:0": true,
      "blacksmith:0": true,
    });
    expect(finished.reveal.fadeOutTier).toEqual({});
    expect(finished.shown["blacksmith:0"]).toBe(1);
  });

  it("waits on the marks revealed by opening the map, and not on a mark that finishes later", () => {
    const opened = holdRevealForMapOpen(
      revealForMapChange(null, [{ id: "woodenHut:0", tier: 1 }], {}).reveal,
    );
    expect(opened.openWait).toEqual({ "woodenHut:0": true });
    const finished = revealForMapChange(
      opened,
      [
        { id: "woodenHut:0", tier: 1 },
        { id: "blacksmith:0", tier: 1 },
      ],
      { "woodenHut:0": 1 },
    );
    expect(finished.reveal.fadeIn["blacksmith:0"]).toBe(true);
    expect(finished.reveal.openWait).toEqual({ "woodenHut:0": true });
  });

  it("simulates an open-map fade, and fades the previous tier out on an upgrade", () => {
    const reveal = revealForSimulatedOpen([
      { id: "woodenHut:0", tier: 1 },
      { id: "coinhouse:0", tier: 3 },
    ]);
    expect(reveal.fadeIn).toEqual({ "woodenHut:0": true, "coinhouse:0": true });
    expect(reveal.fadeOutTier).toEqual({ "coinhouse:0": 2 });
    expect(reveal.openWait).toEqual(reveal.fadeIn);
  });

  it("fades out the old tier when an upgrade finishes on an open map", () => {
    const open = revealForMapChange(
      null,
      [{ id: "blacksmith:0", tier: 1 }],
      { "blacksmith:0": 1 },
    );
    expect(open.reveal.fadeIn).toEqual({});
    const upgraded = revealForMapChange(
      open.reveal,
      [{ id: "blacksmith:0", tier: 2 }],
      open.shown,
    );
    expect(upgraded.reveal.fadeIn).toEqual({ "blacksmith:0": true });
    expect(upgraded.reveal.fadeOutTier).toEqual({ "blacksmith:0": 1 });
  });

  it("treats a new moat as unseen until the map has shown it", () => {
    const features = villageMapFeatureMarks({
      wall: 2,
      traps: 0,
      moat: true,
      chitin: false,
    });
    expect(features).toEqual([
      { id: "palisades", tier: 2 },
      { id: "fortifiedMoat", tier: 1 },
    ]);
    expect(hasUnseenVillageMapMarks(features, { palisades: 2 })).toBe(true);
    expect(
      hasUnseenVillageMapMarks(features, { palisades: 2, fortifiedMoat: 1 }),
    ).toBe(false);
  });
});