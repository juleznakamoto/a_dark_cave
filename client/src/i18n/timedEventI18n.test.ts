import { describe, it, expect, beforeEach } from "vitest";
import i18n from "./index";
import { gameEvents, type GameEvent } from "@/game/rules/events";
import { gameStateSchema } from "@shared/schema";
import {
  getEventCatalogId,
  localizeEventChoices,
  resolveEventMessage,
  resolveEventTitle,
} from "./eventText";
import {
  getEventI18nVars,
  resolveEventDisplayMessage,
  resolveEventDisplayTitle,
  resolveTimedEventCatalogId,
} from "./eventDisplay";
import { getEventChoiceAffordance } from "./eventAffordance";

function getTimedTabEventDefs(): Array<[string, GameEvent]> {
  return Object.entries(gameEvents).filter(
    ([, def]) => def.showAsTimedTab === true,
  );
}

function getChoices(def: GameEvent, state: ReturnType<typeof gameStateSchema.parse>) {
  return typeof def.choices === "function" ? def.choices(state) : def.choices;
}

describe("timed tab event i18n", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("localizes choice labels for every timed-tab event", () => {
    const state = gameStateSchema.parse({});
    const failures: string[] = [];

    for (const [eventId, def] of getTimedTabEventDefs()) {
      const catalogId = getEventCatalogId(def);
      const rawChoices = getChoices(def, state);

      if (!Array.isArray(rawChoices) || rawChoices.length === 0) {
        continue;
      }

      const vars = getEventI18nVars(catalogId, state, eventId);
      const choices = localizeEventChoices(catalogId, rawChoices, state, vars);

      for (const choice of choices ?? []) {
        const label =
          typeof choice.label === "function" ? choice.label(state) : choice.label;
        if (!label || !label.trim()) {
          failures.push(`${eventId}.${choice.id}`);
        }
      }
    }

    expect(failures, `Missing timed-tab choice labels: ${failures.join(", ")}`).toEqual(
      [],
    );
  });

  it("resolves title and message for every timed-tab event", () => {
    const state = gameStateSchema.parse({});
    const titleFailures: string[] = [];
    const messageFailures: string[] = [];

    for (const [eventId, def] of getTimedTabEventDefs()) {
      const catalogId = getEventCatalogId(def);
      const vars = getEventI18nVars(catalogId, state, eventId);

      const title = resolveEventTitle(catalogId, def.title, state, vars);
      const message = resolveEventMessage(
        catalogId,
        def.message,
        state,
        vars,
      );

      const displayTitle = resolveEventDisplayTitle(
        catalogId,
        title,
        state,
        eventId,
      );
      const displayMessage = resolveEventDisplayMessage(
        catalogId,
        message,
        state,
        eventId,
      );

      if (!displayTitle?.trim()) {
        titleFailures.push(eventId);
      }
      if (!displayMessage.trim()) {
        messageFailures.push(eventId);
      }
    }

    expect(
      titleFailures,
      `Missing timed-tab titles: ${titleFailures.join(", ")}`,
    ).toEqual([]);
    expect(
      messageFailures,
      `Missing timed-tab messages: ${messageFailures.join(", ")}`,
    ).toEqual([]);
  });

  it("resolves affordance for timed-tab choices that spend resources", () => {
    const state = gameStateSchema.parse({});
    const failures: string[] = [];

    for (const [eventId, def] of getTimedTabEventDefs()) {
      const catalogId = getEventCatalogId(def);
      const rawChoices = getChoices(def, state);

      if (!Array.isArray(rawChoices) || rawChoices.length === 0) {
        continue;
      }

      const vars = getEventI18nVars(catalogId, state, eventId);
      const choices = localizeEventChoices(catalogId, rawChoices, state, vars);

      for (const choice of choices ?? []) {
        const cost =
          typeof choice.cost === "function" ? choice.cost(state) : choice.cost;
        if (!cost) continue;

        const affordance = getEventChoiceAffordance(choice, state, {
          catalogId,
          vars,
        });

        if (affordance.costs.length === 0) {
          failures.push(`${eventId}.${choice.id} (cost=${JSON.stringify(cost)})`);
        }
      }
    }

    expect(
      failures,
      `Timed-tab costs not parsed for affordance: ${failures.join(", ")}`,
    ).toEqual([]);
  });

  it("resolves catalog ids for numbered timed-tab events", () => {
    expect(resolveTimedEventCatalogId("boneDevourer1")).toBe("boneDevourer");
    expect(resolveTimedEventCatalogId("woodcutter3")).toBe("woodcutter");
    expect(resolveTimedEventCatalogId("feast2")).toBe("feast");
    expect(resolveTimedEventCatalogId("merchant")).toBe("merchant");
  });

  it("resolves woodcutter and bone devourer UI strings with level/cost vars", () => {
    const state = gameStateSchema.parse({});

    for (const level of [1, 3, 6]) {
      const wcId = `woodcutter${level}`;
      const wcDef = gameEvents[wcId];
      const wcCatalog = getEventCatalogId(wcDef);
      const wcVars = getEventI18nVars(wcCatalog, state, wcId);

      const wcTitle = resolveEventDisplayTitle(
        wcCatalog,
        undefined,
        state,
        wcId,
      );
      const wcMessage = resolveEventDisplayMessage(
        wcCatalog,
        undefined,
        state,
        wcId,
      );
      const wcChoices = localizeEventChoices(
        wcCatalog,
        getChoices(wcDef, state),
        state,
        wcVars,
      );

      expect(wcTitle?.length).toBeGreaterThan(0);
      expect(wcMessage).toContain("Food");
      expect(wcChoices?.[0]?.label).toContain("Food");
    }

    for (const level of [1, 4, 6]) {
      const bdId = `boneDevourer${level}`;
      const bdDef = gameEvents[bdId];
      const bdCatalog = getEventCatalogId(bdDef);
      const bdVars = getEventI18nVars(bdCatalog, state, bdId);

      const bdTitle = resolveEventDisplayTitle(
        bdCatalog,
        undefined,
        state,
        bdId,
      );
      const bdMessage = resolveEventDisplayMessage(
        bdCatalog,
        undefined,
        state,
        bdId,
      );
      const bdChoices = localizeEventChoices(
        bdCatalog,
        getChoices(bdDef, state),
        state,
        bdVars,
      );

      expect(bdTitle).toBe("The Bone Devourer");
      expect(bdMessage).toContain("Silver");
      expect(bdChoices?.find((c) => c.id === "sellBones")?.label).toContain(
        "Bones",
      );
      expect(bdChoices?.find((c) => c.id === "refuse")?.label).toBe(
        "Refuse trade",
      );
    }
  });
});
