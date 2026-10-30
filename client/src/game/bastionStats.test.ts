import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDevSave } from "@/game/devSaves";
import { calculateBastionStats } from "@/game/bastionStats";
import { renderFortificationTooltip } from "@/game/rules/itemTooltips";
import { shouldShowAction } from "@/game/rules";
import { villageBuildActions } from "@/game/rules/villageBuildActions";
import { handleBuildHighBastion } from "@/game/rules/villageBuildHandlers";
import { useGameStore } from "@/game/state";
import type { GameState } from "@shared/schema";

function fortState(buildings: Partial<GameState["buildings"]>): GameState {
  const base = buildDevSave("bastion");
  return {
    ...base,
    buildings: {
      ...base.buildings,
      watchtower: 0,
      palisades: 0,
      fortifiedMoat: 0,
      chitinPlating: 0,
      ...buildings,
    },
  };
}

describe("high bastion", () => {
  it("replaces the bastion bonus with +20 defense, +20 attack, and +80 integrity", () => {
    const first = calculateBastionStats(fortState({ bastion: 1 }));
    const high = calculateBastionStats(fortState({ bastion: 2 }));

    expect(first.defense).toBe(10);
    expect(first.attackFromFortifications).toBe(10);
    expect(first.integrity).toBe(60);
    expect(high.defense).toBe(20);
    expect(high.attackFromFortifications).toBe(20);
    expect(high.integrity).toBe(80);
  });

  it("keeps the first bastion description and offers High Bastion as its own action", () => {
    expect(villageBuildActions.buildBastion.description).toBe(
      "Massive fortification serving as the last line of defense",
    );
    expect(villageBuildActions.buildHighBastion.description).toBe(
      "Towering stronghold with deep foundations, built to hold when all else has fallen.",
    );

    const ready = fortState({ bastion: 1, watchtower: 4, palisades: 4 });
    expect(shouldShowAction("buildHighBastion", ready)).toBe(true);
    expect(shouldShowAction("buildBastion", ready)).toBe(false);
    expect(
      shouldShowAction("buildHighBastion", fortState({ bastion: 1, watchtower: 3, palisades: 4 })),
    ).toBe(false);
    expect(
      shouldShowAction("buildHighBastion", fortState({ bastion: 1, watchtower: 4, palisades: 3 })),
    ).toBe(false);
    expect(
      shouldShowAction("buildHighBastion", fortState({ bastion: 2, watchtower: 4, palisades: 4 })),
    ).toBe(false);
  });

  it("raises the existing bastion instead of creating a second building", () => {
    const state = fortState({ bastion: 1, watchtower: 4, palisades: 4 });
    const result = handleBuildHighBastion(state, {
      stateUpdates: {},
      logEntries: [],
      delayedEffects: [],
    });
    expect(result.stateUpdates.buildings?.bastion).toBe(2);
  });

  it("shows the High Bastion description and lists the first bastion under it", () => {
    useGameStore.setState(fortState({ bastion: 2, watchtower: 4, palisades: 4 }));
    const high = renderToStaticMarkup(
      renderFortificationTooltip("bastion", "High Bastion") as ReactElement,
    );
    expect(high).toContain("Towering stronghold with deep foundations, built to hold when all else has fallen.");
    expect(high).not.toContain("Massive fortification");
    expect(high).toContain("20 Attack");
    expect(high).toContain("80 Integrity");
    expect(high).toContain(">Bastion<");
    expect(high).toContain("10 Attack");
    expect(high).toContain("60 Integrity");

    useGameStore.setState(fortState({ bastion: 1 }));
    const first = renderToStaticMarkup(
      renderFortificationTooltip("bastion", "Bastion") as ReactElement,
    );
    expect(first).toContain("Massive fortification serving as the last line of defense");
    expect(first).not.toContain("Towering stronghold");
    expect(first).not.toContain("20 Attack");
    expect(first).toContain("10 Attack");
    expect(first).toContain("60 Integrity");
  });
});
