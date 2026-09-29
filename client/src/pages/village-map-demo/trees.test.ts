import { describe, expect, it } from "vitest";
import { sanitizeSnapshot } from "@/pages/village-map-demo/catalog";
import { TREE_VARIANTS, drawTree, treeReach, treeVariant } from "@/pages/village-map-demo/trees";

describe("tree sketches", () => {
  it("draws ten closed canopies with foliage inside", () => {
    expect(TREE_VARIANTS).toHaveLength(10);
    for (const variant of TREE_VARIANTS) {
      const drawn = drawTree(variant);
      expect(drawn.loops, variant.id).toBeGreaterThan(0);
      expect(drawn.outline.endsWith("Z"), variant.id).toBe(true);
      expect(drawn.foliage.length, variant.id).toBeGreaterThan(8);
    }
  });

  it("keeps one puff as one crown and a spaced stand as three", () => {
    const puff = TREE_VARIANTS.find((variant) => variant.id === "puff");
    const stand = TREE_VARIANTS.find((variant) => variant.id === "saplings");
    const hedge = TREE_VARIANTS.find((variant) => variant.id === "hedge");
    expect(drawTree(puff!).loops).toBe(1);
    expect(drawTree(stand!).loops).toBe(3);
    expect(drawTree(hedge!).loops).toBe(1);
  });

  it("keeps a planted crown inside a saved map", () => {
    const snapshot = sanitizeSnapshot({
      version: 1,
      trees: [
        { id: "tree-1", variant: "puff", x: 12.4, y: 40 },
        { id: "", variant: "puff", x: 1, y: 1 },
        { variant: "grove", x: 1, y: 1 },
      ],
    });
    expect(snapshot?.trees[0]).toMatchObject({ id: "tree-1", variant: "puff", x: 12, y: 40 });
    expect(snapshot?.trees[0].turn).toBeGreaterThanOrEqual(-30);
    expect(snapshot?.trees[0].turn).toBeLessThanOrEqual(30);
    const again = sanitizeSnapshot({
      version: 1,
      trees: [{ id: "tree-1", variant: "puff", x: 12.4, y: 40 }],
    });
    expect(again?.trees[0].turn).toBe(snapshot?.trees[0].turn);
    const kept = sanitizeSnapshot({
      version: 1,
      trees: [{ id: "tree-1", variant: "puff", x: 12, y: 40, turn: 12.4 }],
    });
    expect(kept?.trees[0].turn).toBe(12);
    const clamped = sanitizeSnapshot({
      version: 1,
      trees: [{ id: "tree-1", variant: "puff", x: 12, y: 40, turn: 90 }],
    });
    expect(clamped?.trees[0].turn).toBe(30);
    expect(treeVariant("puff")?.label).toBe("Small puff");
    expect(treeReach(treeVariant("hedge")!)).toBeGreaterThan(treeReach(treeVariant("puff")!));
  });
});
