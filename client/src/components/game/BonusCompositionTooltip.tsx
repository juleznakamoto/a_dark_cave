import React from "react";
import { useGameStore } from "@/game/state";
import {
  getBonusComposition,
  type BonusCompositionLine,
} from "@/game/rules/bonusComposition";
import type { GameState } from "@shared/schema";
import { useUiTranslation } from "@/i18n/useUiTranslation";

function formatPercent(percent: number): string {
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(1);
}

function CompositionLine({
  line,
  t,
}: {
  line: BonusCompositionLine;
  t: (key: string, opts?: Record<string, string | number>) => string;
}) {
  const percent = formatPercent(line.percent);
  const effect = line.isReduction ? `−${percent}%` : `+${percent}%`;
  const text = t("sidePanel.bonusSourceEffect", {
    source: line.sourceLabel,
    effect,
    defaultValue: "{{source}}: {{effect}}",
  });
  return <div>{text}</div>;
}

/**
 * Per-source breakdown for a Bonuses-section row (tools, books, buildings, skills).
 */
export default function BonusCompositionTooltip({
  bonusId,
}: {
  bonusId: string;
}) {
  const { t } = useUiTranslation();
  const state = useGameStore() as unknown as GameState;
  const lines = getBonusComposition(bonusId, state);
  if (lines.length === 0) return null;
  return (
    <div className="text-xs">
      {lines.map((line) => (
        <CompositionLine key={line.sourceId} line={line} t={t} />
      ))}
    </div>
  );
}
