import { describe, expect, it } from "vitest";
import { chooseEndTabIcons } from "./tabLabelFit";

const map = { labelWidth: 36, iconWidth: 14 };
const achievements = { labelWidth: 108, iconWidth: 14 };

describe("chooseEndTabIcons", () => {
  it("keeps both words when they fit", () => {
    expect(
      chooseEndTabIcons({
        clientWidth: 400,
        otherWidth: 200,
        map,
        achievements,
      }),
    ).toEqual({ mapIcon: false, achievementsIcon: false });
  });

  it("collapses Achievements first and keeps Map when that frees enough room", () => {
    expect(
      chooseEndTabIcons({
        clientWidth: 280,
        otherWidth: 200,
        map,
        achievements,
      }),
    ).toEqual({ mapIcon: false, achievementsIcon: true });
  });

  it("uses both icons when neither word fits", () => {
    expect(
      chooseEndTabIcons({
        clientWidth: 230,
        otherWidth: 200,
        map,
        achievements,
      }),
    ).toEqual({ mapIcon: true, achievementsIcon: true });
  });

  it("keeps a word that is already narrower than its icon", () => {
    expect(
      chooseEndTabIcons({
        clientWidth: 100,
        otherWidth: 80,
        map: { labelWidth: 12, iconWidth: 20 },
        achievements,
      }),
    ).toEqual({ mapIcon: false, achievementsIcon: true });
  });

  it("ignores a hidden tab", () => {
    expect(
      chooseEndTabIcons({
        clientWidth: 120,
        otherWidth: 80,
        map: null,
        achievements,
      }),
    ).toEqual({ mapIcon: false, achievementsIcon: true });
  });
});
