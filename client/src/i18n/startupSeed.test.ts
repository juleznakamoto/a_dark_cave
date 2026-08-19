import { describe, expect, it } from "vitest";
import i18n from "./index";

describe("i18n English startup seed", () => {
  it("can render Make Fire before async locale shards load", () => {
    expect(i18n.t("startScreen.makeFire", { ns: "ui" })).toBe("Make Fire");
    expect(i18n.t("startScreen.titleNormal", { ns: "ui" })).toBe("A dark cave.");
    expect(i18n.t("seo.title", { ns: "ui" })).toMatch(/A Dark Cave/);
  });
});
