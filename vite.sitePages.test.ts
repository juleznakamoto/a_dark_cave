import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEV_ONLY_PAGES,
  PACKAGED_HIDDEN_PAGES,
  omittedPageAliases,
  omittedPageSpecs,
} from "./vite.sitePages";

const APP_SOURCE = readFileSync("client/src/App.tsx", "utf8");

describe("omittedPageSpecs", () => {
  it("keeps website pages in the website build", () => {
    expect(omittedPageSpecs({}, "production")).toEqual([...DEV_ONLY_PAGES]);
    expect(omittedPageSpecs({}, "development")).toEqual([]);
  });

  it("drops website pages from packaged game builds", () => {
    const steam = omittedPageSpecs({ VITE_STEAM_BUILD: "1" }, "production");
    expect(steam).toEqual([...PACKAGED_HIDDEN_PAGES, ...DEV_ONLY_PAGES]);
    expect(omittedPageSpecs({ VITE_IOS_BUILD: "1" }, "development")).toEqual([
      ...PACKAGED_HIDDEN_PAGES,
    ]);
    expect(omittedPageSpecs({ VITE_ITCH: "1" }, "production")).toContain(
      "@/pages/press",
    );
    expect(omittedPageSpecs({ VITE_CRAZYGAMES: "1" }, "production")).toContain(
      "@/pages/faq",
    );
  });
});

describe("omittedPageAliases", () => {
  it("matches the page module and not files inside a page folder", () => {
    const [alias] = omittedPageAliases(
      ["@/pages/village-map-demo"],
      "stub.tsx",
    );
    expect(alias?.find.test("@/pages/village-map-demo")).toBe(true);
    expect(alias?.find.test("@/pages/village-map-demo/catalog")).toBe(false);
    expect(alias?.find.test("@/pages/press")).toBe(false);
  });

  it("lists only pages App.tsx actually loads", () => {
    for (const spec of [...PACKAGED_HIDDEN_PAGES, ...DEV_ONLY_PAGES]) {
      expect(APP_SOURCE).toContain(`import("${spec}")`);
    }
  });
});
