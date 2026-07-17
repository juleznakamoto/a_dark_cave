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
  const inactivityReason = useGameStore((s) => s.inactivityReason);
  const authDialogOpen = useGameStore((s) => s.authDialogOpen);
  const setAuthDialogOpen = useGameStore((s) => s.setAuthDialogOpen);
  const { t } = useTranslation("ui");

  const handleContinue = () => {
    logger.log("[INACTIVITY] User clicked continue button");
    resumeFromInactivity();
  };

  const handleReload = () => {
    logger.log("[INACTIVITY] User clicked reload button");
    window.location.reload();
  };

  const handleSignIn = () => {
    logger.log("[SESSION] User opening sign-in from session-loss dialog");
    setAuthDialogOpen(true);
  };

  const isMultiTab = inactivityReason === "multitab";
  const isTimeout = inactivityReason === "timeout";
  const isSession = inactivityReason === "session";

  // Let AuthDialog sit on top while the player re-authenticates.
  if (isSession && authDialogOpen) {
    return null;
  }

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
            {isSession && t("inactivity.session")}
            {isMultiTab && t("inactivity.multiTab")}
            {isTimeout && t("inactivity.timeout")}
          </DialogTitle>
          <DialogDescription className="py-4 space-y-2">
            {isSession && <p>{t("inactivity.sessionDesc")}</p>}
            {isMultiTab && <p>{t("inactivity.multiTabDesc")}</p>}
            {isTimeout && <p>{t("inactivity.timeoutDesc")}</p>}
          </DialogDescription>
        </DialogHeader>
        {isTimeout && (
          <Button onClick={handleContinue} className="w-full">
            {t("inactivity.resume")}
          </Button>
        )}
        {isSession && (
          <Button onClick={handleSignIn} className="w-full">
            {t("inactivity.signInAgain")}
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
