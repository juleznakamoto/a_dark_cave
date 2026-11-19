import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { BUILDING_HIERARCHIES, getBuildingHierarchyChain } from "../buildingHierarchy";
import type { BuildingTooltipEffect } from "./buildingTooltipEffects";
import {
  buildingKeyToActionId,
  getBuildingTooltipEffectEntries,
  resolveTooltipEffectEntryForLevelSection,
  tooltipEffectEntryKey,
  type TooltipEffectEntry,
} from "./buildingTooltipSections";
import { villageBuildActions } from "./villageBuildActions";

function auditGameState(): GameState {
  return {
    buildings: {},
    BTP: 0,
    story: { seen: {} },
    flags: {},
  } as unknown as GameState;
}

/** Keys in the order a level section actually prints them. */
function sectionKeys(
  prevEntries: TooltipEffectEntry[] | null,
  currEntries: TooltipEffectEntry[],
): string[] {
  if (!prevEntries) return currEntries.map(tooltipEffectEntryKey);

  const prevByKey = new Map(
    prevEntries.map((entry) => [tooltipEffectEntryKey(entry), entry]),
  );
  const keys: string[] = [];
  for (const curr of currEntries) {
    const key = tooltipEffectEntryKey(curr);
    const prev = prevByKey.get(key);
    if (!prev) {
      keys.push(key);
      continue;
    }
    if (typeof curr === "string" || typeof prev === "string") {
      if (curr !== prev) keys.push(key);
      continue;
    }
    const currLine = resolveTooltipEffectEntryForLevelSection(curr, false);
    const prevLine = resolveTooltipEffectEntryForLevelSection(prev, false);
    if (currLine !== prevLine || curr.repeatEveryLevel) keys.push(key);
  }
  return keys;
}

function currentKeys(chain: string[], itemId: string, state: GameState): string[] {
  const index = chain.indexOf(itemId);
  const action = villageBuildActions[buildingKeyToActionId(itemId)];
  if (!action || index < 0) return [];
  const own = getBuildingTooltipEffectEntries(action, state);
  const ownKeys = new Set(
    own
      .filter((entry): entry is BuildingTooltipEffect => typeof entry !== "string")
      .map((entry) => entry.key),
  );
  const inherited: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < index; i++) {
    const prevAction = villageBuildActions[buildingKeyToActionId(chain[i])];
    if (!prevAction) continue;
    for (const entry of getBuildingTooltipEffectEntries(prevAction, state)) {
      if (typeof entry === "string") continue;
      if (!entry.key.startsWith("unlocks")) continue;
      if (ownKeys.has(entry.key) || seen.has(entry.key)) continue;
      seen.add(entry.key);
      inherited.push(tooltipEffectEntryKey(entry));
    }
  }
  return [...inherited, ...own.map(tooltipEffectEntryKey)];
}

function reversals(leftName: string, left: string[], rightName: string, right: string[]): string[] {
  const shared = left.filter((key) => right.includes(key));
  const found: string[] = [];
  for (let i = 0; i < shared.length; i++) {
    for (let j = i + 1; j < shared.length; j++) {
      if (right.indexOf(shared[i]) > right.indexOf(shared[j])) {
        found.push(
          `${leftName} lists ${shared[i]} before ${shared[j]}, ${rightName} lists them the other way`,
        );
      }
    }
  }
  return found;
}

describe("upgrade tooltip effect order", () => {
  it("keeps the same effect order on every tier of a chain", () => {
    const state = auditGameState();
    const problems: string[] = [];

    for (const [name, chain] of Object.entries(BUILDING_HIERARCHIES)) {
      const tooltipChain = getBuildingHierarchyChain(chain[chain.length - 1]);
      if (!tooltipChain) continue;

      const top = tooltipChain[tooltipChain.length - 1];
      const lists: { name: string; keys: string[] }[] = [
        { name: top, keys: currentKeys(tooltipChain, top, state) },
      ];
      let prev: TooltipEffectEntry[] | null = null;
      for (let i = 0; i < tooltipChain.length - 1; i++) {
        const action = villageBuildActions[buildingKeyToActionId(tooltipChain[i])];
        if (!action) continue;
        const entries = getBuildingTooltipEffectEntries(action, state);
        lists.push({
          name: tooltipChain[i],
          keys: sectionKeys(prev, entries),
        });
        prev = entries;
      }

      for (let i = 0; i < lists.length; i++) {
        for (let j = i + 1; j < lists.length; j++) {
          problems.push(
            ...reversals(lists[i].name, lists[i].keys, lists[j].name, lists[j].keys).map(
              (line) => `${name}: ${line}`,
            ),
          );
        }
      }
    }

    expect(problems).toEqual([]);
  });
});
