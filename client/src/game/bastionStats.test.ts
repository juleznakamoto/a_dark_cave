import { describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDevSave } from "@/game/devSaves";
import { calculateBastionStats } from "@/game/bastionStats";
import { renderFortificationTooltip } from "@/game/rules/itemTooltips";
import { shouldShowAction } from "@/game/rules";
import { villageBuildActions } from "@/game/rules/villageBuildActions";
import { handleBuildHighBastion, handleBuildHungeringMoat } from "@/game/rules/villageBuildHandlers";
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

describe("hungering moat", () => {
  it("replaces the moat bonus with +15 defense and +5 attack", () => {
    const none = calculateBastionStats(fortState({ fortifiedMoat: 0 }));
    const first = calculateBastionStats(fortState({ fortifiedMoat: 1 }));
    const hungering = calculateBastionStats(fortState({ fortifiedMoat: 2 }));

    expect(first.defense - none.defense).toBe(10);
    expect(first.attackFromFortifications - none.attackFromFortifications).toBe(0);
    expect(hungering.defense - none.defense).toBe(15);
    expect(hungering.attackFromFortifications - none.attackFromFortifications).toBe(5);
    expect(hungering.integrity).toBe(none.integrity);
  });

  it("offers Hungering Moat only after the fortified moat is built", () => {
    expect(villageBuildActions.buildHungeringMoat.description).toBe(
      "Bottomless trench of black water, where something hungry waits to drag down all who enter.",
    );
    expect(villageBuildActions.buildHungeringMoat.cost?.[1]?.["resources.stone"]).toBe(15000);
    expect(shouldShowAction("buildHungeringMoat", fortState({ fortifiedMoat: 0 }))).toBe(false);
    expect(shouldShowAction("buildHungeringMoat", fortState({ fortifiedMoat: 1 }))).toBe(true);
    expect(shouldShowAction("buildFortifiedMoat", fortState({ fortifiedMoat: 1 }))).toBe(false);
    expect(shouldShowAction("buildHungeringMoat", fortState({ fortifiedMoat: 2 }))).toBe(false);
  });

  it("raises the existing moat instead of creating a second building", () => {
    const state = fortState({ fortifiedMoat: 1 });
    const result = handleBuildHungeringMoat(state, {
      stateUpdates: {},
      logEntries: [],
      delayedEffects: [],
    });
    expect(result.stateUpdates.buildings?.fortifiedMoat).toBe(2);
  });

  it("shows the Hungering Moat description and lists the fortified moat under it", () => {
    useGameStore.setState(fortState({ fortifiedMoat: 2 }));
    const hungering = renderToStaticMarkup(
      renderFortificationTooltip("fortifiedMoat", "Hungering Moat") as ReactElement,
    );
    expect(hungering).toContain(
      "Bottomless trench of black water, where something hungry waits to drag down all who enter.",
    );
    expect(hungering).not.toContain("Defensive moat slowing");
    expect(hungering).toContain("5 Attack");
    expect(hungering).toContain("15 Defense");
    expect(hungering).toContain(">Fortified Moat<");
    expect(hungering).toContain("10 Defense");

    useGameStore.setState(fortState({ fortifiedMoat: 1 }));
    const first = renderToStaticMarkup(
      renderFortificationTooltip("fortifiedMoat", "Fortified Moat") as ReactElement,
    );
    expect(first).toContain("Defensive moat slowing and weakening attackers");
    expect(first).not.toContain("Bottomless trench");
    expect(first).toContain("10 Defense");
    expect(first).not.toContain("5 Attack");
  });
});
