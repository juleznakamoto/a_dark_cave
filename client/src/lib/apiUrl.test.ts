import { describe, it, expect } from "vitest";
import { resolveApiUrl, apiUrl } from "./apiUrl";

describe("resolveApiUrl", () => {
  it("returns leading-slash path when base is undefined or empty", () => {
    expect(resolveApiUrl(undefined, "/api/marketing/preferences")).toBe(
      "/api/marketing/preferences",
    );
    expect(resolveApiUrl("", "/api/x")).toBe("/api/x");
    expect(resolveApiUrl("   ", "/api/x")).toBe("/api/x");
  });

  it("normalizes path without leading slash", () => {
    expect(resolveApiUrl(undefined, "api/foo")).toBe("/api/foo");
  });

  it("prefixes non-empty base and strips trailing slash on base", () => {
    expect(
      resolveApiUrl("https://api.example.com", "/api/marketing/preferences"),
    ).toBe("https://api.example.com/api/marketing/preferences");
    expect(
      resolveApiUrl("https://api.example.com/", "/api/marketing/preferences"),
    ).toBe("https://api.example.com/api/marketing/preferences");
  });
});

describe("apiUrl", () => {
  it("returns a string (same-origin path under test env)", () => {
    const u = apiUrl("/api/marketing/preferences");
    expect(typeof u).toBe("string");
    expect(u).toMatch(/^\/api\//);
  });
});
