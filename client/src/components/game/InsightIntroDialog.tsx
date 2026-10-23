import React from "react";
import { cn } from "@/lib/utils";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { outcomeDialogIcon } from "@/game/headerIndicatorIcons";
import OutcomeDialog from "./OutcomeDialog";

interface InsightIntroDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InsightIntroDialog({
  isOpen,
  onClose,
}: InsightIntroDialogProps) {
  const { t } = useUiTranslation();

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
      successLog={t("insightIntro.message", {
        defaultValue:
          "A scholar approaches you. 'We study the world to gain Insight,' she says. 'Insight reveals the world's secrets, and in time, it lets us bend the world to our will.'",
      })}
      title={t("insightIntro.title", { defaultValue: "Insight" })}
      variant="insight"
      buttonText={t("common:buttons.continue")}
      buttonId="insight-intro-dialog-continue"
    />
  );
}
