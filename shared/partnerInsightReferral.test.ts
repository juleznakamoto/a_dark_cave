import { describe, expect, it } from "vitest";
import {
  getActivePartnerInsightSource,
  partnerInsightSourceFromSignals,
} from "./partnerInsightReferral";

describe("partnerInsightSourceFromSignals", () => {
  it("reads tagged landing URLs", () => {
    expect(partnerInsightSourceFromSignals({ utmSource: "itch" })).toBe("itch");
    expect(partnerInsightSourceFromSignals({ utmSource: "itch.io" })).toBe(
      "itch",
    );
    expect(partnerInsightSourceFromSignals({ utmSource: "Bored.com" })).toBe(
      "bored",
    );
    expect(
      partnerInsightSourceFromSignals({ utmSource: "incremental.db" }),
    ).toBe("incrementaldb");
    expect(
      partnerInsightSourceFromSignals({ utmSource: "incrementaldb" }),
    ).toBe("incrementaldb");
  });

  it("reads the linking page when there is no tag", () => {
    expect(
      partnerInsightSourceFromSignals({
        referrer: "https://a-dark-cave.itch.io/a-dark-cave",
      }),
    ).toBe("itch");
    expect(
      partnerInsightSourceFromSignals({
        referrer: "https://www.bored.com/games",
      }),
    ).toBe("bored");
    expect(
      partnerInsightSourceFromSignals({
        referrer: "https://www.incrementaldb.com/game/a-dark-cave",
      }),
    ).toBe("incrementaldb");
    expect(
      partnerInsightSourceFromSignals({
        parentOrigin: "https://incremental.db",
      }),
    ).toBe("incrementaldb");
  });

  it("ignores other sites and prefers a partner tag over the referrer", () => {
    expect(
      partnerInsightSourceFromSignals({
        referrer: "https://store.steampowered.com/",
      }),
    ).toBeNull();
    expect(
      partnerInsightSourceFromSignals({ utmSource: "newsletter" }),
    ).toBeNull();
    expect(
      partnerInsightSourceFromSignals({
        utmSource: "bored",
        referrer: "https://itch.io/",
      }),
    ).toBe("bored");
  });
});

describe("getActivePartnerInsightSource", () => {
  it("returns the partner whose Make Fire flag is set", () => {
    expect(
      getActivePartnerInsightSource({
        boredFirstPurchaseInsightActive: true,
      }),
    ).toBe("bored");
    expect(getActivePartnerInsightSource({})).toBeNull();
  });
});
