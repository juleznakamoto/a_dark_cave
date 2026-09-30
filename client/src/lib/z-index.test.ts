import { describe, expect, it } from "vitest";
import { Z_INDEX } from "./z-index";

describe("Z_INDEX", () => {
  it("keeps the Steam wishlist callout under modal backdrops and above the invite", () => {
    expect(Z_INDEX.hoverCalloutUnderModal).toBeLessThan(Z_INDEX.dialogOverlay);
    expect(Z_INDEX.hoverCallout).toBeGreaterThan(Z_INDEX.floatingPromo);
    expect(Z_INDEX.hoverCallout).toBeLessThan(Z_INDEX.toast);
    expect(Z_INDEX.toast).toBeLessThan(Z_INDEX.dropdown);
  });
});
