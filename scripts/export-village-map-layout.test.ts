import { describe, expect, it } from "vitest";
import { renderVillageMapLayout } from "./export-village-map-layout";

describe("village map layout export", () => {
  it("refuses a tree id that cannot sit in the generated file", () => {
    expect(() =>
      renderVillageMapLayout({
        trees: [{ id: 'x"; alert(1)', variant: "puff", x: 1, y: 2, turn: 0 }],
      }),
    ).toThrow(/unsafe tree/);
  });
});
