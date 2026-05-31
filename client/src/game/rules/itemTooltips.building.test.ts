import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import {
  BUILDING_HIERARCHIES,
  getBuildingHierarchyChain,
} from "../buildingHierarchy";
import {
  buildingKeyToActionId,
  getBuildingTooltipEffectEntries,
  getBuildingTooltipSnapshot,
  getLevelSectionEffectLines,
  resolveTooltipEffectEntryForLevelSection,
  type TooltipEffectEntry,
} from "./buildingTooltipSections";
import { villageBuildActions } from "./villageBuildActions";
import {
  getPalisadesTooltipEffectsForLevel,
  getWatchtowerTooltipEffectsForLevel,
} from "./villageBuildActions";
import { resolveBuildingTooltipEffect } from "@/i18n/tooltipLabels";

/** Default state for function-based tooltipEffects (tannery, foundry, huts). */
function auditGameState(): GameState {
  return {
    buildings: {},
    BTP: 0,
    story: { seen: {} },
    flags: {},
  } as unknown as GameState;
}

const TOOLTIP_CHAINS = Object.entries(BUILDING_HIERARCHIES).filter(
  ([name]) => name !== "fortifications" && name !== "dark",
);

function maxTierBuildingKey(chain: string[]): string {
  return chain[chain.length - 1];
}

function findRepeatedLinesAcrossSections(
  levelSections: { level: number; effects: string[] }[],
): string[] {
  const seen = new Set<string>();
  const repeats: string[] = [];
  for (const section of levelSections) {
    for (const line of section.effects) {
      if (seen.has(line)) {
        repeats.push(`Level ${section.level}: "${line}"`);
      }
      seen.add(line);
    }
  }
  return repeats;
}

function findDeltaInsteadOfAbsoluteIssues(
  chain: string[],
  gameState: GameState,
): string[] {
  const issues: string[] = [];
  let prevEntries: TooltipEffectEntry[] | null = null;

  for (let index = 0; index < chain.length; index++) {
    const buildAction = villageBuildActions[buildingKeyToActionId(chain[index])];
    const entries = getBuildingTooltipEffectEntries(buildAction, gameState);
    const sectionLines = getLevelSectionEffectLines(
      prevEntries,
      entries,
      false,
    );

    for (const line of sectionLines) {
      for (const entry of entries) {
        if (typeof entry === "string") continue;
        const currAmt =
          typeof entry.options?.amount === "number"
            ? entry.options.amount
            : typeof entry.options?.percent === "number"
              ? entry.options.percent
              : null;
        if (currAmt === null) continue;

        const prev = prevEntries?.find(
          (e) =>
            typeof e !== "string" &&
            e.key === entry.key &&
            typeof e !== "string",
        );
        const prevAmt =
          prev && typeof prev !== "string"
            ? typeof prev.options?.amount === "number"
              ? prev.options.amount
              : typeof prev.options?.percent === "number"
                ? prev.options.percent
                : null
            : null;

        if (prevAmt === null || currAmt <= prevAmt) continue;

        const absLine = resolveTooltipEffectEntryForLevelSection(entry, false);
        if (line !== absLine) {
          const delta = currAmt - prevAmt;
          const deltaEntry = {
            ...entry,
            options: { ...entry.options, amount: delta, percent: delta },
          };
          const deltaLine = resolveBuildingTooltipEffect(deltaEntry);
          if (line === deltaLine) {
            issues.push(
              `${chain[index]} ${entry.key}: shows delta ${delta}, expected absolute ${currAmt}`,
            );
          }
        }
      }
    }

    prevEntries = entries;
  }

  return issues;
}

function findMissingInheritedUnlocks(
  chain: string[],
  gameState: GameState,
): string[] {
  const maxKey = chain[chain.length - 1];
  const snapshot = getBuildingTooltipSnapshot(maxKey, chain, gameState);
  const issues: string[] = [];

  const tier1 = villageBuildActions[buildingKeyToActionId(chain[0])];
  const tier1Entries = getBuildingTooltipEffectEntries(tier1, gameState);

  for (const entry of tier1Entries) {
    if (typeof entry === "string") continue;
    if (!entry.key.startsWith("unlocks")) continue;

    const tier1Line = resolveTooltipEffectEntryForLevelSection(entry, false);
    const inCurrent = snapshot.current.includes(tier1Line);
    if (!inCurrent) {
      issues.push(
        `${maxKey}: tier-1 unlock "${tier1Line}" missing from current effects`,
      );
    }
  }

  return issues;
}

function findStorageFootnoteInLevelSections(
  levelSections: { level: number; effects: string[] }[],
): string[] {
  const issues: string[] = [];
  for (const section of levelSections) {
    for (const line of section.effects) {
      if (/Silver|Gold/i.test(line) && /Resource Limit/i.test(line)) {
        issues.push(`Level ${section.level}: storage footnote in tier line`);
      }
    }
  }
  return issues;
}

describe("building tooltip audit at max tier", () => {
  const gameState = auditGameState();

  for (const [chainName, chain] of TOOLTIP_CHAINS) {
    const maxKey = maxTierBuildingKey(chain);

    it(`${chainName} (${maxKey}): tier-1 unlocks appear in max-tier current effects`, () => {
      const chainForTooltip = getBuildingHierarchyChain(maxKey);
      expect(chainForTooltip).not.toBeNull();
      const missing = findMissingInheritedUnlocks(chainForTooltip!, gameState);
      expect(missing, missing.join("; ")).toEqual([]);
    });

    it(`${chainName} (${maxKey}): no repeated lines across level sections`, () => {
      const chainForTooltip = getBuildingHierarchyChain(maxKey);
      expect(chainForTooltip).not.toBeNull();

      const { levelSections } = getBuildingTooltipSnapshot(
        maxKey,
        chainForTooltip!,
        gameState,
      );
      const repeats = findRepeatedLinesAcrossSections(levelSections);
      expect(repeats, repeats.join("; ")).toEqual([]);
    });

    it(`${chainName} (${maxKey}): no delta values where absolute expected`, () => {
      const chainForTooltip = getBuildingHierarchyChain(maxKey)!;
      const deltas = findDeltaInsteadOfAbsoluteIssues(chainForTooltip, gameState);
      expect(deltas, deltas.join("; ")).toEqual([]);
    });

    it(`${chainName} (${maxKey}): storage level lines omit gold/silver footnote`, () => {
      const chainForTooltip = getBuildingHierarchyChain(maxKey)!;
      const { levelSections } = getBuildingTooltipSnapshot(
        maxKey,
        chainForTooltip,
        gameState,
      );
      const footnotes = findStorageFootnoteInLevelSections(levelSections);
      expect(footnotes, footnotes.join("; ")).toEqual([]);
    });
  }

  it("documents expected max-tier snapshots for key chains", () => {
    expect(
      getBuildingTooltipSnapshot(
        "sanctum",
        getBuildingHierarchyChain("sanctum")!,
        gameState,
      ).levelSections.map((s) => s.effects),
    ).toEqual([
      ["-2 Madness"],
      ["-5 Madness"],
      ["-8 Madness"],
      ["-12 Madness"],
    ]);

    expect(
      getBuildingTooltipSnapshot(
        "treasury",
        getBuildingHierarchyChain("treasury")!,
        gameState,
      ).levelSections.map((s) => s.effects),
    ).toEqual([
      ["Unlocks Investments"],
      ["Invest up to 500 Gold", "+1% Lucky Chance"],
      ["Invest up to 1000 Gold", "+2% Lucky Chance"],
    ]);

    expect(
      getBuildingTooltipSnapshot(
        "greatVault",
        getBuildingHierarchyChain("greatVault")!,
        gameState,
      ).levelSections.map((s) => s.effects),
    ).toEqual([
      ["Resource Limit: 1'000"],
      ["Resource Limit: 2'500"],
      ["Resource Limit: 5'000", "2.5% Craft Discount"],
      ["Resource Limit: 10'000", "2.5% Build Discount"],
      ["Resource Limit: 25'000", "5% Craft Discount"],
      ["Resource Limit: 50'000", "5% Build Discount"],
    ]);

    const merchantsGuild = getBuildingTooltipSnapshot(
      "merchantsGuild",
      getBuildingHierarchyChain("merchantsGuild")!,
      gameState,
    );
    expect(merchantsGuild.current).toContain("Unlocks Call Merchant");
    expect(
      merchantsGuild.levelSections.slice(1).flatMap((s) => s.effects),
    ).not.toContain("Unlocks Call Merchant");

    const grandBlacksmith = getBuildingTooltipSnapshot(
      "grandBlacksmith",
      getBuildingHierarchyChain("grandBlacksmith")!,
      gameState,
    );
    expect(grandBlacksmith.current).toContain("Unlocks Crafting");
    expect(
      grandBlacksmith.levelSections.slice(1).flatMap((s) => s.effects),
    ).not.toContain("Unlocks Crafting");
  });
});

describe("fortification tooltip audit at max internal level", () => {
  it("watchtower level 4 sections use absolute stats without cross-level repeats", () => {
    const sections: string[][] = [];
    for (let level = 1; level <= 4; level++) {
      sections.push(
        getWatchtowerTooltipEffectsForLevel(level).map((e) =>
          resolveBuildingTooltipEffect(e),
        ),
      );
    }
    expect(sections[0]).toEqual([
      "+5 Attack",
      "+2 Defense",
      "+20 Integrity",
    ]);
    expect(sections[3]).toEqual([
      "+25 Attack",
      "+15 Defense",
      "+60 Integrity",
    ]);
  });

  it("palisades level 4 sections use absolute stats", () => {
    const sections: string[][] = [];
    for (let level = 1; level <= 4; level++) {
      sections.push(
        getPalisadesTooltipEffectsForLevel(level).map((e) =>
          resolveBuildingTooltipEffect(e),
        ),
      );
    }
    expect(sections[3]).toEqual(["+20 Defense", "+60 Integrity"]);
  });
});
