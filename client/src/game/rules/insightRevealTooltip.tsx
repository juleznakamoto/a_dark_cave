import React from "react";
import type { GameState } from "@shared/schema";
import { villageBuildActions } from "./villageBuildActions";
import {
  getBuildingTooltipEffectEntries,
  resolveTooltipEffectEntry,
} from "./buildingTooltipSections";
import { craftActionIdToItemKey, getCraftItemDescription } from "./craftItemDescription";
import { clothingEffects, toolEffects, weaponEffects } from "./effects";
import { renderItemTooltip } from "./itemTooltips";
import { isCraftOnceAction, isBuildingAction } from "./insightReveal";

const EFFECTS_ONLY_DISPLAY = {
  showTitle: false,
  showDescription: false,
  showEffects: true,
} as const;

function resolveBuildingEffectLines(
  actionId: string,
  state: GameState,
): string[] {
  const action = villageBuildActions[actionId];
  if (!action) return [];
  const entries = getBuildingTooltipEffectEntries(action, state);
  return entries.map((entry) => resolveTooltipEffectEntry(entry, false));
}

function getCraftItemType(
  itemKey: string,
): "tool" | "weapon" | "clothing" | null {
  if (toolEffects[itemKey]) return "tool";
  if (weaponEffects[itemKey]) return "weapon";
  if (clothingEffects[itemKey]) return "clothing";
  return null;
}

/** Effect lines only (no title/description) after insight reveal is purchased. */
export function getRevealedEffectsTooltipContent(
  actionId: string,
  state: GameState,
): React.ReactNode | null {
  if (isCraftOnceAction(actionId)) {
    const itemKey = craftActionIdToItemKey(actionId);
    const itemType = getCraftItemType(itemKey);
    if (!itemType) return null;
    return renderItemTooltip(itemKey, itemType, undefined, EFFECTS_ONLY_DISPLAY);
  }

  if (isBuildingAction(actionId)) {
    const lines = resolveBuildingEffectLines(actionId, state);
    if (lines.length === 0) return null;
    return (
      <div>
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    );
  }

  return null;
}

export function getRevealedEffectsForActionTooltip(
  actionId: string,
  state: GameState,
): React.ReactNode | null {
  if (!(state.revealedEffects ?? []).includes(actionId)) return null;
  return getRevealedEffectsTooltipContent(actionId, state);
}

/** @deprecated Prefer {@link getRevealedEffectsForActionTooltip} inside {@link composeActionTooltip}. */
export function renderRevealedEffectsTooltipSection(
  actionId: string,
  state: GameState,
): React.ReactNode | null {
  return getRevealedEffectsForActionTooltip(actionId, state);
}
