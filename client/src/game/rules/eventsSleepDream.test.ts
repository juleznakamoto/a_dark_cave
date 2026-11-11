import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import i18n from "@/i18n";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { resolveEventMessage, resolveEventTitle } from "@/i18n/eventText";
import { getUiTooltip } from "@/i18n/tooltipLabels";
import {
  rollSleepDream,
  SLEEP_DREAM_MIN_MS,
  BAD_DREAMS_DURATION_MS,
  BAD_DREAMS_EXTRA_SECONDS,
  buildBadDreamDialogEntry,
  isBadDreamsActive,
  sleepFocusPoints,
  startBadDreams,
} from "./eventsSleepDream";
import { getExecutionTime } from "./executionTime";
import "@/game/rules";

describe("sleep dreams", () => {
  it("does not roll a sleep shorter than 1 hour", () => {
    expect(SLEEP_DREAM_MIN_MS).toBe(60 * 60 * 1000);
    expect(rollSleepDream(30 * 60 * 1000, () => 0)).toBe("none");
    expect(rollSleepDream(SLEEP_DREAM_MIN_MS - 1, () => 0)).toBe("none");
  });

  it("rolls a bad dream, a good dream, or nothing", () => {
    const elapsed = SLEEP_DREAM_MIN_MS;
    expect(rollSleepDream(elapsed, () => 0)).toBe("bad");
    expect(rollSleepDream(elapsed, () => 0.14)).toBe("bad");
    expect(rollSleepDream(elapsed, () => 0.15)).toBe("good");
    expect(rollSleepDream(elapsed, () => 0.49)).toBe("good");
    expect(rollSleepDream(elapsed, () => 0.5)).toBe("none");
    expect(rollSleepDream(elapsed, () => 0.99)).toBe("none");
  });

  it("doubles focus for a good dream, and again for Bell Blessing", () => {
    expect(sleepFocusPoints(3, {})).toBe(3);
    expect(sleepFocusPoints(3, { goodDream: true })).toBe(6);
    expect(sleepFocusPoints(3, { bellBlessing: true })).toBe(6);
    expect(
      sleepFocusPoints(3, { bellBlessing: true, goodDream: true }),
    ).toBe(12);
    expect(sleepFocusPoints(0, { goodDream: true })).toBe(0);
  });

  it("starts a 10 minute Bad Dreams effect that adds 2 seconds to timed actions", () => {
    const before = gameStateSchema.parse({});
    const started = startBadDreams();
    expect(started.isActive).toBe(true);
    expect(started.duration).toBe(BAD_DREAMS_DURATION_MS);
    expect(started.endTime - started.startTime).toBe(BAD_DREAMS_DURATION_MS);
    const now = Date.now();
    const slowed = gameStateSchema.parse({
      badDreamsState: {
        isActive: true,
        startTime: now,
        endTime: now + BAD_DREAMS_DURATION_MS,
        duration: BAD_DREAMS_DURATION_MS,
      },
    });
    expect(isBadDreamsActive(slowed, now + 1)).toBe(true);
    expect(getExecutionTime("chopWood", before)).toBe(4);
    expect(getExecutionTime("chopWood", slowed)).toBe(
      4 + BAD_DREAMS_EXTRA_SECONDS,
    );
    expect(isBadDreamsActive(slowed, now + BAD_DREAMS_DURATION_MS)).toBe(
      false,
    );
  });

  it("localizes both dreams and the bad-dream tooltip", async () => {
    await ensureGameplayLocalesLoaded();
    const state = gameStateSchema.parse({});
    const expected = {
      de: ["Gute Träume", "Schlechte Träume", "Aktionen dauern 2 s länger"],
      fr: ["Beaux rêves", "Mauvais rêves", "Les actions prennent 2 s de plus"],
      es: ["Buenos sueños", "Malos sueños", "Las acciones tardan 2 s más"],
      it: ["Bei sogni", "Brutti sogni", "Le azioni richiedono 2s in più"],
      "pt-BR": ["Bons Sonhos", "Pesadelos", "As ações levam 2s a mais"],
      "zh-CN": ["美梦", "噩梦", "行动耗时增加 2 秒"],
      ja: ["良い夢", "悪夢", "行動に2秒余分にかかる"],
      pl: ["Dobre sny", "Złe sny", "Akcje trwają o 2 s dłużej"],
      ru: ["Добрые сны", "Дурные сны", "Действия занимают на 2 с больше"],
    } as const;

    try {
      for (const [lang, [goodTitle, badTitle, delay]] of Object.entries(expected)) {
        await i18n.changeLanguage(lang);
        expect(resolveEventTitle("goodDreams", state)).toBe(goodTitle);
        expect(resolveEventTitle("badDreams", state)).toBe(badTitle);
        expect(resolveEventMessage("goodDreams", undefined, state)).not.toMatch(/You dreamed/);
        expect(resolveEventMessage("badDreams", undefined, state)).not.toMatch(/You dreamed/);
        expect(getUiTooltip("badDreams", "Bad Dreams")).toBe(badTitle);
        expect(getUiTooltip("badDreamsDelay", "Actions take {{seconds}}s longer", { seconds: 2 })).toBe(delay);
      }
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("opens Bad Dreams as one Continue window", async () => {
    await ensureGameplayLocalesLoaded();
    await i18n.changeLanguage("en");
    const entry = buildBadDreamDialogEntry(gameStateSchema.parse({}));
    expect(entry.eventId).toBe("badDreams");
    expect(entry.title).toBe("Bad Dreams");
    expect(entry.message).toContain("You dreamed the village burned");
    expect(resolveEventMessage("goodDreams", undefined, gameStateSchema.parse({}))).toContain(
      "You dreamed of the village at ease",
    );
    expect(entry.choices).toEqual([
      expect.objectContaining({ id: "acknowledge", label: "Continue" }),
    ]);
  });
});
