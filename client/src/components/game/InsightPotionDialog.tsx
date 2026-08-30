import React from "react";
import { cn, formatNumber } from "@/lib/utils";
import { getResourceName } from "@/i18n/resolveGameText";
import { useTranslation } from "react-i18next";
import { outcomeDialogIcon } from "@/game/headerIndicatorIcons";
import OutcomeDialog from "./OutcomeDialog";

interface InsightPotionDialogData {
  insightGain: number;
}

interface InsightPotionDialogProps {
  isOpen: boolean;
  data: InsightPotionDialogData | null;
  onClose: () => void;
}

export default function InsightPotionDialog({
  isOpen,
  data,
  onClose,
}: InsightPotionDialogProps) {
  const { t } = useTranslation(["ui", "common"]);
  if (!data || data.insightGain <= 0) return null;

  const { insightGain } = data;

  return (
    <OutcomeDialog
      isOpen={isOpen}
      onClose={onClose}
      icon={
        <span
          className={cn(
            outcomeDialogIcon("insight").glyphClassName,
            outcomeDialogIcon("insight").uiIconSizeClassName,
          )}
        >
          {outcomeDialogIcon("insight").symbol}
        </span>
      }
      iconRingClassName={outcomeDialogIcon("insight").ringClassName}
      successLog={t("ui:insightPotion.message")}
      title={t("ui:insightPotion.title")}
      variant="insight"
      buttonText={t("common:buttons.continue")}
      buttonId="insight-potion-dialog-continue"
    >
      <div className="text-sm text-blue-300">
        +{formatNumber(insightGain)} {getResourceName("insight", "Insight")}
      </div>
    </OutcomeDialog>
  );
}
