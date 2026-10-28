import { describe, expect, it } from "vitest";
import enLog from "@/i18n/locales/en/ui/log.json";
import {
  MADNESS_DEATH_RAMPAGE_CHANCE,
  buildMadnessDeathLog,
} from "./madnessDeathLog";

const catalog = enLog.log.madnessDeath;

describe("buildMadnessDeathLog", () => {
  it("keeps a single death as a suicide", () => {
    expect(buildMadnessDeathLog(1, () => 0)).toEqual({
      message: catalog.one,
      logKey: "madnessDeath.one",
    });
  });

  it("keeps a group suicide when the rampage roll misses", () => {
    expect(
      buildMadnessDeathLog(4, () => MADNESS_DEATH_RAMPAGE_CHANCE),
    ).toEqual({
      message: "4 villagers succumb to madness and take their own lives.",
      logKey: "madnessDeath.other",
      logVars: { count: 4 },
    });
  });

  it("retells two deaths as one villager killing the other", () => {
    expect(buildMadnessDeathLog(2, () => 0)).toEqual({
      message: catalog.rampageOne,
      logKey: "madnessDeath.rampageOne",
    });
  });

  it("retells three or more deaths as one villager killing the rest", () => {
    expect(buildMadnessDeathLog(4, () => 0.149)).toEqual({
      message: "One villager goes mad, kills 3 others, and then himself.",
      logKey: "madnessDeath.rampageOther",
      logVars: { others: 3 },
    });
    expect(catalog.rampageOther).toBe(
      "One villager goes mad, kills {{others}} others, and then himself.",
    );
  });
});
