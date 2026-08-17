/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { resolveSpaHref } from "./spaNavigate";

const SUBDIR =
  "https://files.crazygames.com/games/a-dark-cave/index.html";

describe("resolveSpaHref", () => {
  it("keeps absolute in-app paths on the normal website", () => {
    expect(
      resolveSpaHref("/end-screen", "https://a-dark-cave.com/", {
        hashRouted: false,
      }),
    ).toBe("/end-screen");
    expect(
      resolveSpaHref("/?game=true", "https://a-dark-cave.com/end-screen", {
        hashRouted: false,
      }),
    ).toBe("/?game=true");
  });

  it("stays in the CrazyGames folder and uses the hash route", () => {
    expect(
      resolveSpaHref("/end-screen", `${SUBDIR}#/`, { hashRouted: true }),
    ).toBe(`${SUBDIR}#/end-screen`);
    expect(
      resolveSpaHref("/", `${SUBDIR}#/end-screen`, { hashRouted: true }),
    ).toBe(`${SUBDIR}#/`);
  });

  it("puts continue-playing query on the real search so startupIntent can read it", () => {
    expect(
      resolveSpaHref("/?game=true", `${SUBDIR}#/end-screen`, {
        hashRouted: true,
      }),
    ).toBe(`${SUBDIR}?game=true#/`);
    expect(
      resolveSpaHref(
        "/?game=true&openShop=true&cruelHighlight=true",
        `${SUBDIR}#/`,
        { hashRouted: true },
      ),
    ).toBe(`${SUBDIR}?game=true&openShop=true&cruelHighlight=true#/`);
  });

  it("clears leftover query when returning home", () => {
    expect(
      resolveSpaHref("/", `${SUBDIR}?game=true#/end-screen`, {
        hashRouted: true,
      }),
    ).toBe(`${SUBDIR}#/`);
  });
});
