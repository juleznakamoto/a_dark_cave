import { describe, expect, it } from "vitest";
import {
  buildUtmAttributionFromParams,
  hasUtmAttribution,
  LEGACY_GOOGLE_ADS_UTM_SOURCE,
  sanitizeUtmField,
  utmAttributionFromSearchParams,
} from "./utmAttribution";

describe("utmAttribution", () => {
  it("sanitizes and truncates fields", () => {
    expect(sanitizeUtmField("  playlight  ")).toBe("playlight");
    expect(sanitizeUtmField("")).toBeNull();
    expect(sanitizeUtmField("x".repeat(200))?.length).toBe(128);
  });

  it("builds attribution from standard UTM params", () => {
    const attr = buildUtmAttributionFromParams(
      {
        utm_source: "newsletter",
        utm_medium: "email",
        utm_campaign: "launch",
        utm_content: "hero",
        utm_term: "cave",
      },
      123,
    );
    expect(attr).toEqual({
      source: "newsletter",
      medium: "email",
      campaign: "launch",
      content: "hero",
      term: "cave",
      capturedAt: 123,
    });
    expect(hasUtmAttribution(attr)).toBe(true);
  });

  it("maps legacy c= into google_ads source + campaign", () => {
    const attr = buildUtmAttributionFromParams({ c: "campaign-1" }, 1);
    expect(attr).toMatchObject({
      source: LEGACY_GOOGLE_ADS_UTM_SOURCE,
      campaign: "campaign-1",
      medium: null,
    });
  });

  it("keeps explicit utm_source when legacy c is also present", () => {
    const attr = buildUtmAttributionFromParams(
      {
        utm_source: "google",
        c: "campaign-1",
      },
      1,
    );
    expect(attr).toMatchObject({
      source: "google",
      campaign: "campaign-1",
    });
  });

  it("returns null when no campaign params exist", () => {
    expect(buildUtmAttributionFromParams({})).toBeNull();
    expect(
      utmAttributionFromSearchParams(new URLSearchParams("foo=1")),
    ).toBeNull();
  });

  it("parses from URLSearchParams", () => {
    const search = new URLSearchParams(
      "utm_source=playlight&utm_medium=discovery&utm_campaign=exit",
    );
    expect(utmAttributionFromSearchParams(search, 9)).toMatchObject({
      source: "playlight",
      medium: "discovery",
      campaign: "exit",
      capturedAt: 9,
    });
  });
});
