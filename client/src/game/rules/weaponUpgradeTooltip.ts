import { getEffectName, getTooltipActionLabel } from "@/i18n/resolveGameText";
import { getUiTooltip } from "@/i18n/tooltipLabels";
import {
  AXE_HIERARCHY,
  BOW_HIERARCHY,
  CLOAK_HIERARCHY,
  LANTERN_HIERARCHY,
  PICKAXE_HIERARCHY,
  SWORD_HIERARCHY,
} from "./effectsCalculation";
import { clothingEffects, toolEffects, weaponEffects } from "./effects";

export type WeaponUpgradeLevelSection = {
  level: number;
  label: string;
  effects: string[];
};

type WeaponEffectLine = {
  key: string;
  line: string;
};

const CHAIN_UNLOCKS: Record<string, { key: string; fallback: string }> = {
  crude_bow: { key: "unlocksForest", fallback: "Unlocks Forest" },
  stone_axe: { key: "unlocksVillage", fallback: "Unlocks Village" },
};

/** Drop placeholder ids that are not a real tool or weapon (the lantern chain starts with one). */
function definedChain(chain: readonly string[]): string[] {
  return chain.filter(
    (id) => toolEffects[id] || weaponEffects[id] || clothingEffects[id],
  );
}

const UPGRADE_CHAINS = [
  BOW_HIERARCHY,
  SWORD_HIERARCHY,
  AXE_HIERARCHY,
  PICKAXE_HIERARCHY,
  LANTERN_HIERARCHY,
  CLOAK_HIERARCHY,
].map(definedChain);

export function getWeaponHierarchyChain(itemId: string): string[] | null {
  for (const chain of UPGRADE_CHAINS) {
    if (chain.includes(itemId)) return chain;
  }
  return null;
}

/** Sidebar row to highlight while hovering the craft button for this upgrade. */
export function getWeaponUpgradeHighlightId(weaponId: string): string | null {
  const chain = getWeaponHierarchyChain(weaponId);
  if (!chain) return null;
  const index = chain.indexOf(weaponId);
  if (index <= 0) return null;
  return chain[index - 1];
}

/**
 * Lines that match the side-panel weapon tooltip, keyed so a later tier can
 * show only what changed. Absolute values, same as building upgrade sections.
 */
function effectForItem(itemId: string) {
  return weaponEffects[itemId] ?? toolEffects[itemId] ?? clothingEffects[itemId];
}

function effectCategory(
  itemId: string,
): "weapons" | "tools" | "clothing" {
  if (weaponEffects[itemId]) return "weapons";
  if (toolEffects[itemId]) return "tools";
  return "clothing";
}

function getWeaponEffectLines(itemId: string): WeaponEffectLine[] {
  const effect = effectForItem(itemId);
  if (!effect) return [];

  const lines: WeaponEffectLine[] = [];
  const strength = effect.bonuses?.generalBonuses?.strength ?? 0;
  if (strength > 0) {
    lines.push({
      key: "strength",
      line: getUiTooltip("strength", "Strength: +{{value}}", {
        value: strength,
      }),
    });
  }

  for (const [actionId, bonus] of Object.entries(
    effect.bonuses?.actionBonuses ?? {},
  )) {
    const actionLabel = getTooltipActionLabel(actionId);
    if (bonus.resourceMultiplier && bonus.resourceMultiplier !== 1) {
      lines.push({
        key: `${actionId}.resourceMultiplier`,
        line: getUiTooltip(
          "actionBonusPercent",
          "{{action}}: +{{percent}}% Bonus",
          {
            action: actionLabel,
            percent: Math.round((bonus.resourceMultiplier - 1) * 100),
          },
        ),
      });
    }
    if (bonus.executionTimeReduction && bonus.executionTimeReduction !== 0) {
      lines.push({
        key: `${actionId}.executionTimeReduction`,
        line: getUiTooltip(
          "durationReduction",
          "{{action}}: -{{seconds}}s Duration",
          {
            action: actionLabel,
            seconds: bonus.executionTimeReduction,
          },
        ),
      });
    }
  }

  const unlock = CHAIN_UNLOCKS[itemId];
  if (unlock) {
    lines.push({
      key: unlock.key,
      line: getUiTooltip(unlock.key, unlock.fallback),
    });
  }

  return lines;
}

function marginalLines(
  prev: WeaponEffectLine[] | null,
  curr: WeaponEffectLine[],
): string[] {
  if (!prev) return curr.map((entry) => entry.line);

  const prevByKey = new Map(prev.map((entry) => [entry.key, entry.line]));
  const lines: string[] = [];
  for (const entry of curr) {
    const previous = prevByKey.get(entry.key);
    if (previous === undefined || previous !== entry.line) {
      lines.push(entry.line);
    }
  }
  return lines;
}

/** Craft-button effects for an upgrade: only lines that differ from the previous tier. */
export function getWeaponUpgradeMarginalEffectLines(weaponId: string): string[] {
  const chain = getWeaponHierarchyChain(weaponId);
  if (!chain) return [];
  const index = chain.indexOf(weaponId);
  if (index <= 0) return [];

  const curr = getWeaponEffectLines(weaponId);
  const prev = getWeaponEffectLines(chain[index - 1]);
  return marginalLines(prev, curr);
}

/** Unlock lines from earlier tiers that this weapon's own tooltip does not repeat. */
export function getWeaponInheritedUnlockLines(weaponId: string): string[] {
  const chain = getWeaponHierarchyChain(weaponId);
  if (!chain) return [];
  const index = chain.indexOf(weaponId);
  if (index <= 0) return [];

  const currentKeys = new Set(
    getWeaponEffectLines(weaponId).map((entry) => entry.key),
  );
  const lines: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < index; i++) {
    for (const entry of getWeaponEffectLines(chain[i])) {
      if (!entry.key.startsWith("unlocks")) continue;
      if (currentKeys.has(entry.key) || seen.has(entry.key)) continue;
      seen.add(entry.key);
      lines.push(entry.line);
    }
  }

  return lines;
}

/** Prior tiers for the side-panel tooltip, highest first. Current tier is omitted. */
export function getWeaponUpgradeLevelSections(
  weaponId: string,
): WeaponUpgradeLevelSection[] {
  const chain = getWeaponHierarchyChain(weaponId);
  if (!chain) return [];
  const index = chain.indexOf(weaponId);
  if (index <= 0) return [];

  const sections: WeaponUpgradeLevelSection[] = [];
  let prev: WeaponEffectLine[] | null = null;

  for (let i = 0; i < index; i++) {
    const id = chain[i];
    const effect = effectForItem(id);
    if (!effect) continue;
    const entries = getWeaponEffectLines(id);
    const effects = marginalLines(prev, entries);
    prev = entries;
    if (effects.length === 0) continue;
    sections.push({
      level: i + 1,
      label: getEffectName(effectCategory(id), id, effect.name),
      effects,
    });
  }

  return sections.reverse();
}
