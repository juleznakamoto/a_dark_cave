import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { resumeFromInactivity } from "@/game/loop";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

export default function InactivityDialog() {
  const { inactivityReason } = useGameStore();
  const { t } = useTranslation("ui");

  const handleContinue = () => {
    logger.log("[INACTIVITY] User clicked continue button");
    resumeFromInactivity();
  };

  const handleReload = () => {
    logger.log("[INACTIVITY] User clicked reload button");
    window.location.reload();
  };

  const isMultiTab = inactivityReason === "multitab";
  const isTimeout = inactivityReason === "timeout";

  return (
    <Dialog open={true} onOpenChange={() => { }}>
      <DialogContent
        className="[--adc-dialog-max-w:28rem] z-[210]"
        hideClose={true}
        hideOverlay={true}
        customBackground={
          <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm animate-fade-in" />
        }
      >
        <DialogHeader>
          <DialogTitle className="leading-6">
            {isMultiTab && t("inactivity.multiTab")}
            {isTimeout && t("inactivity.timeout")}
          </DialogTitle>
          <DialogDescription className="py-4 space-y-2">
            {isMultiTab && <p>{t("inactivity.multiTabDesc")}</p>}
            {isTimeout && <p>{t("inactivity.timeoutDesc")}</p>}
          </DialogDescription>
        </DialogHeader>
        {isTimeout && (
          <Button onClick={handleContinue} className="w-full">
            {t("inactivity.resume")}
          </Button>
        )}
        {isMultiTab && (
          <Button onClick={handleReload} className="w-full">
            {t("inactivity.reload")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
