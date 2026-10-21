import { beforeAll, describe, expect, it } from "vitest";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import {
  resolveEventChoiceCost,
  resolveEventChoiceLabel,
  resolveEventLogMessage,
  resolveEventMessage,
  resolveEventTitle,
} from "@/i18n/eventText";
import type { SupportedLocale } from "@/i18n/locales";
import i18n from "@/i18n";

const LOCALES: SupportedLocale[] = [
  "en",
  "de",
  "es",
  "fr",
  "it",
  "pt-BR",
  "ru",
  "zh-CN",
  "ja",
  "pl",
];

const VARS = { foodCost: "1'000", goldCost: "100" };

describe("jugglerGreatFeast i18n", () => {
  beforeAll(async () => {
    for (const locale of LOCALES) {
      await ensureGameplayLocalesLoaded(locale);
    }
  });

  it.each(LOCALES)("%s has complete jugglerGreatFeast catalog strings", async (locale) => {
    await i18n.changeLanguage(locale);

    const title = resolveEventTitle("jugglerGreatFeast", undefined, VARS);
    const first = resolveEventMessage(
      "jugglerGreatFeast",
      () => "first",
      {} as never,
      VARS,
    );
    const ret = resolveEventMessage(
      "jugglerGreatFeast",
      () => "return",
      {} as never,
      VARS,
    );
    const label = resolveEventChoiceLabel(
      "jugglerGreatFeast",
      "makeGreatFeast",
      VARS,
    );
    const cost = resolveEventChoiceCost(
      "jugglerGreatFeast",
      "makeGreatFeast",
      undefined,
      VARS,
    );
    const refuse = resolveEventChoiceLabel("jugglerGreatFeast", "noFeast");
    const outcome1 = resolveEventLogMessage("jugglerGreatFeast", "outcome1");
    const outcome2 = resolveEventLogMessage("jugglerGreatFeast", "outcome2");
    const outcome3 = resolveEventLogMessage("jugglerGreatFeast", "outcome3");

    for (const [name, value] of Object.entries({
      title,
      first,
      ret,
      label,
      cost,
      refuse,
      outcome1,
      outcome2,
      outcome3,
    })) {
      expect(value?.trim().length, `${locale}.${name}`).toBeGreaterThan(0);
      expect(value, `${locale}.${name} em dash`).not.toMatch(/\u2014/);
    }

    expect(cost).toContain("1'000");
    expect(cost).toContain("100");
    // Action label, not the raw cost on the button
    expect(label).not.toContain("1'000");
    expect(first).not.toEqual(ret);
  });
});
