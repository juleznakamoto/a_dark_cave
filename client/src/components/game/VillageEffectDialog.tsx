import React from "react";
import { useTranslation } from "react-i18next";
import { resolveOutcomeLogMessage } from "@/i18n/logDisplay";
import {
  getVillageEffectTheme,
  type VillageEffectDialogData,
} from "@/game/villageEffectThemes";
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
  const { t } = useTranslation("common");
  if (!data) return null;

  const theme = getVillageEffectTheme(data.themeId);
  const effectTheme: OutcomeDialogEffectTheme = {
    border: theme.border,
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
      buttonText={t("buttons.continue")}
      buttonId="village-effect-dialog-continue"
    />
  );
}
