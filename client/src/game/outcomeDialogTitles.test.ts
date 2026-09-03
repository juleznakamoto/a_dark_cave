import { describe, it, expect, beforeAll } from "vitest";
import { gameStateSchema, type GameState } from "@shared/schema";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { getEventCatalogId, resolveEventTitle } from "@/i18n/eventText";
import {
  EventManager,
  gameEvents,
  type EventChoiceEffectResult,
  type GameEvent,
} from "@/game/rules/events";
import {
  detectRewards,
  rewardPayloadHasOutcomeLosses,
  rewardPayloadHasPositiveChanges,
} from "@/game/state";

function madnessDelta(
  updates: Partial<GameState>,
  current: GameState,
): number {
  if (typeof updates.stats?.madnessFromEvents === "number") {
    return updates.stats.madnessFromEvents - (current.stats.madnessFromEvents || 0);
  }
  if (typeof updates.stats?.madness === "number") {
    return updates.stats.madness - (current.stats.madness || 0);
  }
  return 0;
}

function getChoices(def: GameEvent, state: GameState) {
  return typeof def.choices === "function" ? def.choices(state) : def.choices;
}

function wouldOpenMadnessOnlyDialog(
  updates: EventChoiceEffectResult,
  state: GameState,
  eventId: string,
): boolean {
  if (updates._combatData) return false;
  const change = madnessDelta(updates, state);
  if (change === 0) return false;
  const rewards = detectRewards(updates, state, eventId, { trackLosses: true });
  const hasLog = Boolean(
    updates._logMessageKey || updates._logMessageI18nKey || updates._logMessage,
  );
  const hasRewards =
    rewardPayloadHasPositiveChanges(rewards) ||
    (rewardPayloadHasOutcomeLosses(rewards) && hasLog);
  return !hasRewards;
}

describe("outcome dialog titles", () => {
  beforeAll(async () => {
    await ensureGameplayLocalesLoaded();
  });

  it("madness-only event outcomes resolve a real event title", () => {
    const state = gameStateSchema.parse({});
    const missingTitle: string[] = [];
    const applyErrors: string[] = [];

    for (const [eventId, def] of Object.entries(gameEvents)) {
      if (eventId === "merchant") continue;
      const choices = getChoices(def, state);
      if (!Array.isArray(choices)) continue;

      for (const choice of choices) {
        let updates: Partial<GameState>;
        try {
          updates = EventManager.applyEventChoice(state, choice.id, eventId);
        } catch (error) {
          applyErrors.push(
            `${eventId}.${choice.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
          continue;
        }
        if (updates._choiceRejected) continue;
        if (!wouldOpenMadnessOnlyDialog(updates, state, eventId)) continue;

        const catalogId = getEventCatalogId(def);
        const title = resolveEventTitle(catalogId, def.title, state);
        if (!title?.trim() || title === "Madness Event") {
          missingTitle.push(`${eventId}.${choice.id}`);
        }
      }
    }

    expect(applyErrors, applyErrors.join("\n")).toEqual([]);
    expect(missingTitle, `Missing titles: ${missingTitle.join(", ")}`).toEqual([]);
  });
});
