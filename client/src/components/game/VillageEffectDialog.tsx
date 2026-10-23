import React from "react";
import { resolveOutcomeLogMessage } from "@/i18n/logDisplay";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { getVillageEffectTheme } from "@/game/headerIndicatorIcons";
import type { VillageEffectDialogData } from "@/game/villageEffectThemes";
import OutcomeDialog, { type OutcomeDialogEffectTheme } from "./OutcomeDialog";

export type { VillageEffectDialogData };

interface VillageEffectDialogProps {
  isOpen: boolean;
  data: VillageEffectDialogData | null;
  onClose: () => void;
}

export default function VillageEffectDialog({
  isOpen,
  data,
  onClose,
}: VillageEffectDialogProps) {
  const { t } = useUiTranslation();
  if (!data) return null;

  const theme = getVillageEffectTheme(data.themeId);
  const effectTheme: OutcomeDialogEffectTheme = {
    border: theme.border,
    chromeColor: theme.chromeColor,
    iconRing: theme.iconRing,
    glowRgb: theme.glowRgb,
  };

  return (
    <OutcomeDialog
      isOpen={isOpen}
      onClose={onClose}
      icon={
        <span className={theme.iconClassName} aria-hidden>
          {theme.symbol}
        </span>
      }
      successLog={resolveOutcomeLogMessage(data.message)}
      title={data.title}
      variant="success"
      effectTheme={effectTheme}
      buttonText={t("common:buttons.continue")}
      buttonId="village-effect-dialog-continue"
    />
  );
}
