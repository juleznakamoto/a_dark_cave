import { beforeEach, describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { createInitialState } from "@/game/store/createInitialState";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import {
  resolveEventChoiceLabel,
  resolveEventMessage,
  resolveEventTitle,
} from "@/i18n/eventText";
import {
  RAGGED_YOUTH_FUR_COST,
  RAGGED_YOUTH_SILVER_REWARD,
  raggedYouthEvents,
} from "./eventsRaggedYouth";

function state(patch: Partial<GameState> = {}): GameState {
  const base = createInitialState();
  return {
    ...base,
    ...patch,
    resources: { ...base.resources, ...patch.resources },
    villagers: { ...base.villagers, ...patch.villagers },
    seenResources: patch.seenResources ?? base.seenResources,
    story: {
      ...base.story,
      ...patch.story,
      seen: { ...base.story.seen, ...patch.story?.seen },
    },
  };
}

function ready(patch: Partial<GameState> = {}): GameState {
  return state({
    ...patch,
    resources: { fur: RAGGED_YOUTH_FUR_COST, ...patch.resources },
    villagers: { free: 2, ...patch.villagers },
    seenResources: patch.seenResources ?? ["silver"],
    story: patch.story,
  });
}

const ask = raggedYouthEvents.raggedYouth;
const back = raggedYouthEvents.raggedYouthReturn;

function choiceEffect(
  event: typeof ask,
  choiceId: string,
  game: GameState,
): Partial<GameState> {
  const choices = event.choices;
  if (!Array.isArray(choices)) throw new Error("expected choices array");
  const choice = choices.find((entry) => entry.id === choiceId);
  if (!choice?.effect) throw new Error(choiceId);
  return choice.effect(game);
}

describe("ragged youth", () => {
  it("is a dialog that waits until silver, fur, and a villager", () => {
    expect(ask.showAsTimedTab).toBeUndefined();
    expect(ask.timeProbability).toBe(20);
    expect(ask.condition!(state())).toBe(false);
    expect(ask.condition!(ready({ seenResources: [] }))).toBe(false);
    expect(
      ask.condition!(
        ready({ resources: { fur: RAGGED_YOUTH_FUR_COST - 1 } as GameState["resources"] }),
      ),
    ).toBe(false);
    expect(ask.condition!(ready({ villagers: { free: 0 } as GameState["villagers"] }))).toBe(
      false,
    );
    expect(ask.condition!(ready())).toBe(true);
  });

  it("gives the fur and arms the return visit", () => {
    const game = ready({ resources: { fur: 80, silver: 1 } as GameState["resources"] });
    const next = choiceEffect(ask, "giveFur", game);
    expect(next.resources?.fur).toBe(80 - RAGGED_YOUTH_FUR_COST);
    expect(next.resources?.silver).toBe(1);
    expect(next.story?.seen?.raggedYouthHelped).toBe(true);
    expect(ask.condition!(ready({ story: next.story }))).toBe(false);
    expect(back.condition!(ready({ story: next.story }))).toBe(true);
  });

  it("kills a villager when refused and does not call him back", () => {
    const game = ready();
    const next = choiceEffect(ask, "doNotHelp", game);
    expect(next.villagers?.free).toBe(1);
    expect(next.villagersKilled).toBe(1);
    expect(next.resources).toBeUndefined();
    expect(next.story?.seen?.raggedYouthRefused).toBe(true);
    expect(back.condition!(ready({ story: next.story }))).toBe(false);
  });

  it("pays 50 silver about ten minutes later", () => {
    expect(back.showAsTimedTab).toBeUndefined();
    expect(back.timeProbability).toBe(10);
    expect(back.condition!(ready())).toBe(false);
    const game = ready({
      resources: { fur: 0, silver: 4 } as GameState["resources"],
      story: { seen: { raggedYouthHelped: true } } as GameState["story"],
    });
    const next = choiceEffect(back, "takeSilver", game);
    expect(next.resources?.silver).toBe(4 + RAGGED_YOUTH_SILVER_REWARD);
    expect(next.story?.seen?.raggedYouthRepaid).toBe(true);
    expect(back.condition!(ready({ story: next.story }))).toBe(false);
  });
});

describe("ragged youth english copy", () => {
  beforeEach(async () => {
    await ensureGameplayLocalesLoaded();
  });

  it("asks for fur now and pays silver on the return", async () => {
    const game = state();
    const askText = resolveEventMessage("raggedYouth", ask.message, game, ask.i18nVars);
    expect(askText).toContain("family");
    expect(askText).toContain("later");
    const vars = ask.i18nVars as Record<string, number>;
    expect(resolveEventChoiceLabel("raggedYouth", "giveFur", vars)).toContain("50");
    expect(resolveEventChoiceLabel("raggedYouth", "doNotHelp", vars)).toContain("help");

    const returnText = resolveEventMessage(
      "raggedYouthReturn",
      back.message,
      game,
      back.i18nVars,
    );
    expect(resolveEventTitle("raggedYouthReturn", game, back.i18nVars)).toBe(
      "The Father Returns",
    );
    expect(returnText).toContain("father");
    expect(returnText).toContain("furs");
    expect(returnText).toContain("cold");
    expect(returnText).toContain(String(RAGGED_YOUTH_SILVER_REWARD));
    expect(returnText).toContain("Silver");
  });
});
