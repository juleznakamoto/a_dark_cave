import { beforeAll, describe, it, expect } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import {
  resolveEventChoiceLabel,
  resolveEventMessage,
  resolveEventTitle,
} from "@/i18n/eventText";
import i18n from "@/i18n";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { FINANCE_EXPEDITION_TIERS } from "./financeExpedition";
import {
  hasMadeEnoughExpeditionsForChainmaster,
  scholarResearchEvents,
} from "./eventsScholarResearch";

function baseState(overrides: Record<string, unknown> = {}) {
  return gameStateSchema.parse({
    buildings: { inkwardenAcademy: 1 },
    story: {
      seen: {
        scholarResearchExpeditionsUnlocked: true,
        financeExpeditionUsageCount: 0,
      },
    },
    ...overrides,
  });
}

describe("scholarResearchTreasureHint", () => {
  const event = scholarResearchEvents.scholarResearchTreasureHint;

  it("approaches once the academy stands and the chainmaster storyline is still out of reach", () => {
    expect(event.condition(baseState())).toBe(true);
    expect(
      event.condition(
        baseState({
          story: {
            seen: {
              scholarResearchExpeditionsUnlocked: true,
              financeExpeditionUsageCount: FINANCE_EXPEDITION_TIERS.length - 1,
            },
          },
        }),
      ),
    ).toBe(true);
  });

  it("waits until expeditions are unlocked and the academy is built", () => {
    expect(
      event.condition(
        baseState({
          story: { seen: { financeExpeditionUsageCount: 0 } },
        }),
      ),
    ).toBe(false);
    expect(
      event.condition(baseState({ buildings: { inkwardenAcademy: 0 } })),
    ).toBe(false);
  });

  it("stays quiet after she has spoken, or once the chainmaster storyline can start", () => {
    expect(
      event.condition(
        baseState({
          story: {
            seen: {
              scholarResearchExpeditionsUnlocked: true,
              scholarResearchTreasureHintSeen: true,
            },
          },
        }),
      ),
    ).toBe(false);
    expect(
      event.condition(
        baseState({
          story: {
            seen: {
              scholarResearchExpeditionsUnlocked: true,
              financeExpeditionUsageCount: FINANCE_EXPEDITION_TIERS.length,
            },
          },
        }),
      ),
    ).toBe(false);
    expect(
      hasMadeEnoughExpeditionsForChainmaster(
        baseState({
          story: {
            seen: {
              leatherboundBookFound: true,
              financeExpeditionUsageCount: 0,
            },
          },
        }),
      ),
    ).toBe(true);
  });

  it("marks the hint seen when the player continues", () => {
    const choice = event.choices![0];
    const result = choice.effect(baseState());
    expect(result.story?.seen?.scholarResearchTreasureHintSeen).toBe(true);
  });
});

describe("scholarResearchTreasureHint copy", () => {
  beforeAll(async () => {
    await ensureGameplayLocalesLoaded();
  });

  it.each(SUPPORTED_LOCALES)("%s has a title, message, and continue label", async (locale) => {
    await i18n.changeLanguage(locale);
    const title = resolveEventTitle("scholarResearchTreasureHint", undefined);
    const message = resolveEventMessage(
      "scholarResearchTreasureHint",
      undefined,
      baseState(),
    );
    const label = resolveEventChoiceLabel(
      "scholarResearchTreasureHint",
      "continue",
      undefined,
    );

    expect(title && title.trim().length).toBeGreaterThan(0);
    expect(message.trim().length).toBeGreaterThan(0);
    expect(label.trim().length).toBeGreaterThan(0);
    expect(message).not.toContain("\u2014");
    expect(title).not.toContain("\u2014");
  });
});
