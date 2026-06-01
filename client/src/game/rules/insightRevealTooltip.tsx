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
import { getUiTooltip } from "@/i18n/tooltipLabels";
import { isCraftOnceAction, isBuildingAction } from "./insightReveal";

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

export function getRevealedEffectsTooltipContent(
  actionId: string,
  state: GameState,
): React.ReactNode | null {
  if (isCraftOnceAction(actionId)) {
    const itemKey = craftActionIdToItemKey(actionId);
    const itemType = getCraftItemType(itemKey);
    if (!itemType) {
      const desc = getCraftItemDescription(actionId);
      return desc ? <div className="text-gray-400">{desc}</div> : null;
    }
    return renderItemTooltip(itemKey, itemType);
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

export function renderRevealedEffectsTooltipSection(
  actionId: string,
  state: GameState,
): React.ReactNode | null {
  if (!(state.revealedEffects ?? []).includes(actionId)) return null;
  const content = getRevealedEffectsTooltipContent(actionId, state);
  if (!content) return null;
  return (
    <div className="border-t border-border mt-1 pt-1">
      <div className="text-muted-foreground mb-0.5">
        {getUiTooltip("insightRevealEffects", "Effects")}
      </div>
      {content}
    </div>
  );
}
