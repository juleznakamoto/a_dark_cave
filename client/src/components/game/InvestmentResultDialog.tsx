import React from "react";
import OutcomeDialog, {
  OUTCOME_DIALOG_REWARD_STYLE_ICON_CLASS,
} from "./OutcomeDialog";
import { formatNumber } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  getInvestmentResultDialogBodyMeta,
  type InvestmentOutcomeUiKind,
  type InvestmentResultDialogPayload,
} from "@/game/rules/investmentHallTables";

interface InvestmentResultDialogProps {
  isOpen: boolean;
  data: InvestmentResultDialogPayload | null;
  onClose: () => void;
}

function OutcomeIcon({ kind }: { kind: InvestmentOutcomeUiKind }) {
  const cls = OUTCOME_DIALOG_REWARD_STYLE_ICON_CLASS;
  switch (kind) {
    case "lucky_chance":
      return (
        <span className={cls} aria-hidden>
          ⇮
        </span>
      );
    case "wipeout":
      return (
        <span className={`${cls} rotate-180`} aria-hidden>
          ⇮
        </span>
      );
    case "partial_loss":
      return (
        <span className={cls} aria-hidden>
          ⇩
        </span>
      );
    case "success":
      return (
        <span className={cls} aria-hidden>
          ⇧
        </span>
      );
  }
}

export default function InvestmentResultDialog({
  isOpen,
  data,
  onClose,
}: InvestmentResultDialogProps) {
  const { t } = useTranslation(["ui", "common"]);
  if (!data) return null;

  const { kind, goldDelta } = data;
  const isLoss = kind === "partial_loss" || kind === "wipeout";
  const { bodyKey, bodyVars } = getInvestmentResultDialogBodyMeta(data);
  const bodyText = t(`ui:${bodyKey}`, bodyVars);

  const goldLine = (
    <div className="text-sm text-foreground tabular-nums">
      {goldDelta >= 0 ? "+" : "-"}
      {formatNumber(Math.abs(goldDelta))}{" "}
      {t("common:resources.gold")}
    </div>
  );

  return (
    <OutcomeDialog
      isOpen={isOpen}
      onClose={onClose}
      icon={<OutcomeIcon kind={kind} />}
      successLog={bodyText}
      title={t("ui:investmentResult.title")}
      variant={isLoss ? "loss" : "success"}
      buttonText={t("common:buttons.continue")}
      buttonId="investment-result-dialog-continue"
    >
      {goldLine}
    </OutcomeDialog>
  );
}
