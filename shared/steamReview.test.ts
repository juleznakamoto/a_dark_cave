import { describe, expect, it } from "vitest";
import {
  STEAM_DEMO_APP_ID,
  STEAM_FULL_APP_ID,
  STEAM_PLAYTEST_APP_ID,
  steamReviewPageUrl,
} from "./steamReview";

describe("steamReviewPageUrl", () => {
  it("builds the store Write a review form for known apps", () => {
    expect(steamReviewPageUrl(STEAM_FULL_APP_ID)).toBe(
      "https://store.steampowered.com/recommended/recommendgame/4882240",
    );
    expect(steamReviewPageUrl(STEAM_DEMO_APP_ID)).toBe(
      "https://store.steampowered.com/recommended/recommendgame/4971800",
    );
    expect(steamReviewPageUrl(STEAM_PLAYTEST_APP_ID)).toBe(
      "https://store.steampowered.com/recommended/recommendgame/4972040",
    );
  });

  it("rejects unknown app ids", () => {
    expect(steamReviewPageUrl(480)).toBeNull();
    expect(steamReviewPageUrl(Number.NaN)).toBeNull();
  });
});
