import React from "react";
import { outcomeDialogIcon } from "@/game/headerIndicatorIcons";
import OutcomeDialog from "./OutcomeDialog";
import { cn, formatNumber } from "@/lib/utils";
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

const INVEST_ICON_ID = {
  lucky_chance: "investLucky",
  wipeout: "investWipeout",
  partial_loss: "investPartialLoss",
  success: "investSuccess",
} as const;

function OutcomeIcon({ kind }: { kind: InvestmentOutcomeUiKind }) {
  const icon = outcomeDialogIcon(INVEST_ICON_ID[kind]);
  return (
    <span
      className={cn(icon.glyphClassName, icon.uiIconSizeClassName)}
      aria-hidden
    >
      {icon.symbol}
    </span>
  );
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
      iconRingClassName={outcomeDialogIcon(INVEST_ICON_ID[kind]).ringClassName}
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
