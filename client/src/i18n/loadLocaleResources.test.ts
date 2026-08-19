import { describe, expect, it } from "vitest";
import {
  isStartupLocaleModulePath,
  isStartupSurfacePath,
} from "./loadLocaleResources";

describe("startup locale module selection", () => {
  it("includes only shell and SEO UI shards for the requested locale", () => {
    expect(
      isStartupLocaleModulePath("./locales/de/ui/shell.json", "de"),
    ).toBe(true);
    expect(
      isStartupLocaleModulePath("./locales/de/ui/seo.json", "de"),
    ).toBe(true);
    expect(
      isStartupLocaleModulePath("./locales/de/ui/panels.json", "de"),
    ).toBe(false);
    expect(
      isStartupLocaleModulePath("./locales/de/events.json", "de"),
    ).toBe(false);
    expect(
      isStartupLocaleModulePath("./locales/en/ui/shell.json", "de"),
    ).toBe(false);
  });

  it("treats play routes as startup surfaces", () => {
    expect(isStartupSurfacePath("/")).toBe(true);
    expect(isStartupSurfacePath("/galaxy")).toBe(true);
    expect(isStartupSurfacePath("/faq")).toBe(false);
  });
});
