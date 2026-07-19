import { afterEach, describe, expect, it, vi } from "vitest";
import { SITE_ORIGIN } from "@shared/publicSeo";
import {
  fetchPublishedBuildSha,
  parseVersionResponseSha,
  publishedSiteOriginForAdminEnv,
  resolveCurrentBuildShaForAdmin,
} from "./publishedBuildSha";

describe("publishedBuildSha", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps prod to the public site origin and leaves dev local", () => {
    expect(publishedSiteOriginForAdminEnv("prod")).toBe(SITE_ORIGIN);
    expect(publishedSiteOriginForAdminEnv("dev")).toBeNull();
  });

  it("parses /api/version sha bodies", () => {
    expect(parseVersionResponseSha({ sha: "abc123" })).toBe("abc123");
    expect(parseVersionResponseSha({ sha: "  " })).toBeNull();
    expect(parseVersionResponseSha({ version: "1.0.0" })).toBeNull();
    expect(parseVersionResponseSha(null)).toBeNull();
  });

  it("fetches published sha from /api/version", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sha: "pubsha", version: "1.0.0" }),
    });

    await expect(
      fetchPublishedBuildSha("https://a-dark-cave.com/", fetchImpl as typeof fetch),
    ).resolves.toBe("pubsha");

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://a-dark-cave.com/api/version",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("returns null when version fetch fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 502 });
    await expect(
      fetchPublishedBuildSha(SITE_ORIGIN, fetchImpl as typeof fetch),
    ).resolves.toBeNull();
  });

  it("prod admin analysis uses published site sha over local deploy", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sha: "live-prod-sha" }),
    });

    await expect(
      resolveCurrentBuildShaForAdmin(
        "prod",
        "local-newer-sha",
        fetchImpl as typeof fetch,
      ),
    ).resolves.toBe("live-prod-sha");
  });

  it("prod falls back to local deploy sha when published fetch fails", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network"));

    await expect(
      resolveCurrentBuildShaForAdmin(
        "prod",
        "local-fallback",
        fetchImpl as typeof fetch,
      ),
    ).resolves.toBe("local-fallback");
  });

  it("dev admin analysis uses local deploy sha (no remote fetch)", async () => {
    const fetchImpl = vi.fn();

    await expect(
      resolveCurrentBuildShaForAdmin(
        "dev",
        "dev-preview-sha",
        fetchImpl as typeof fetch,
      ),
    ).resolves.toBe("dev-preview-sha");

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
