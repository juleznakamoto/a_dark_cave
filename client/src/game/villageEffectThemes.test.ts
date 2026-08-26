import { describe, expect, it } from "vitest";
import { resolveVillageEffectAnnouncementTheme } from "./villageEffectThemes";

describe("resolveVillageEffectAnnouncementTheme", () => {
  it("detects feast from state activation and feast event ids", () => {
    expect(
      resolveVillageEffectAnnouncementTheme("feast3", {
        feastState: { isActive: true, endTime: Date.now() + 60_000 },
      }),
    ).toBe("feast");
    expect(resolveVillageEffectAnnouncementTheme("feast2", {})).toBe("feast");
  });

  it("maps solstice, curse, frostfall, and mining boost events by catalog id", () => {
    expect(
      resolveVillageEffectAnnouncementTheme("solsticeGathering", {}),
    ).toBe("solstice");
    expect(resolveVillageEffectAnnouncementTheme("witchsCurse", {})).toBe(
      "curse",
    );
    expect(resolveVillageEffectAnnouncementTheme("frostfall", {})).toBe(
      "frostfall",
    );
    expect(
      resolveVillageEffectAnnouncementTheme("unnamedWanderer", {}),
    ).toBe("miningBoost");
    expect(
      resolveVillageEffectAnnouncementTheme("brimstoneFlux3", {}),
    ).toBe("brimstoneFlux");
  });

  it("detects brimstone flux from timed state activation", () => {
    expect(
      resolveVillageEffectAnnouncementTheme("brimstoneFlux1", {
        brimstoneFluxState: { isActive: true, endTime: Date.now() + 60_000 },
      }),
    ).toBe("brimstoneFlux");
  });

  it("detects disgust only when the debuff is newly stacked", () => {
    const prevEnd = Date.now() + 60_000;
    expect(
      resolveVillageEffectAnnouncementTheme(
        "theDamned",
        {
          disgustState: { isActive: true, endTime: prevEnd + 30_000 },
        },
        { disgustState: { isActive: true, endTime: prevEnd } },
      ),
    ).toBe("disgust");
    expect(
      resolveVillageEffectAnnouncementTheme("theDamned", {}, {
        disgustState: { isActive: false, endTime: 0 },
      }),
    ).toBeNull();
  });

  it("detects fog from fog state activation (riddle penalties)", () => {
    expect(
      resolveVillageEffectAnnouncementTheme("riddleOfAges", {
        fogState: { isActive: true, endTime: Date.now() + 60_000 },
      }),
    ).toBe("fog");
  });

  it("detects staring deer and forest fear from state activation", () => {
    expect(
      resolveVillageEffectAnnouncementTheme("staringDeer", {
        staringDeerState: { isActive: true, endTime: Date.now() + 60_000 },
      }),
    ).toBe("staringDeer");
    expect(
      resolveVillageEffectAnnouncementTheme("forestFear", {
        forestFearState: { isActive: true, endTime: Date.now() + 60_000 },
      }),
    ).toBe("forestFear");
    expect(resolveVillageEffectAnnouncementTheme("staringDeer", {})).toBe(
      "staringDeer",
    );
    expect(resolveVillageEffectAnnouncementTheme("forestFear", {})).toBe(
      "forestFear",
    );
  });

  it("returns null for unrelated announcements", () => {
    expect(
      resolveVillageEffectAnnouncementTheme("obsidianOrbVisit", {
        schematics: { obsidian_orb_schematic: true },
      }),
    ).toBeNull();
    expect(resolveVillageEffectAnnouncementTheme("merchant", {})).toBeNull();
  });
});
