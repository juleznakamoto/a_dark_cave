import { describe, expect, it } from "vitest";
import {
  initialLocaleLoadMode,
  isPublicDocLocaleModulePath,
  isPublicDocPath,
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

describe("public doc locale selection", () => {
  it("includes FAQ/About copy plus startup shards, not gameplay catalogs", () => {
    expect(
      isPublicDocLocaleModulePath("./locales/de/ui/publicPages.json", "de"),
    ).toBe(true);
    expect(
      isPublicDocLocaleModulePath("./locales/de/ui/shell.json", "de"),
    ).toBe(true);
    expect(
      isPublicDocLocaleModulePath("./locales/de/ui/panels.json", "de"),
    ).toBe(false);
    expect(
      isPublicDocLocaleModulePath("./locales/de/events.json", "de"),
    ).toBe(false);
    expect(
      isPublicDocLocaleModulePath("./locales/en/ui/publicPages.json", "de"),
    ).toBe(false);
  });

  it("recognizes FAQ, About, Press, and legal routes", () => {
    expect(isPublicDocPath("/faq")).toBe(true);
    expect(isPublicDocPath("/about/")).toBe(true);
    expect(isPublicDocPath("/press?utm=1")).toBe(true);
    expect(isPublicDocPath("/privacy")).toBe(true);
    expect(isPublicDocPath("/")).toBe(false);
    expect(isPublicDocPath("/end-screen")).toBe(false);
  });

  it("boots public docs without the gameplay locale dump", () => {
    expect(initialLocaleLoadMode("/")).toBe("startup");
    expect(initialLocaleLoadMode("/faq")).toBe("publicDoc");
    expect(initialLocaleLoadMode("/about")).toBe("publicDoc");
    expect(initialLocaleLoadMode("/press")).toBe("publicDoc");
    expect(initialLocaleLoadMode("/privacy")).toBe("publicDoc");
    expect(initialLocaleLoadMode("/end-screen")).toBe("gameplay");
    expect(initialLocaleLoadMode("/admin/dashboard")).toBe("gameplay");
  });
});
