import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useInlineButtonParticles } from "@/components/ui/bubbly-button";
import { CRUEL_MODE_ACTIVATE_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";
import { audioManager, CRUEL_MODE_ACTIVATE_VOLUME } from "@/lib/audio";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { useSteamEditionActive } from "@/hooks/useSteamEditionActive";
import { useGameStore } from "@/game/state";
import { isSteamCruelModeUnlockAvailable } from "@/game/steamCruelModeUnlock";
import { SHOP_ITEMS } from "@shared/shopItems";

/** Above RestartGameDialog `z-[70]` so the activate burst stays visible. */
const CRUEL_MODE_CHECK_PARTICLE_Z = 90;

interface RestartGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options?: { cruelMode?: boolean }) => void;
}

export function RestartGameDialog({
  isOpen,
  onClose,
  onConfirm,
}: RestartGameDialogProps) {
  const { t } = useUiTranslation();
  const isSteamEdition = useSteamEditionActive();
  const preferCruelMode = useGameStore((s) => s.restartGamePreferCruelMode);
  const hasWonNormalGame = useGameStore((s) => s.hasWonNormalGame);
  const devGameMode = useGameStore((s) => s.devGameMode);
  const showCruelCheckbox =
    preferCruelMode ||
    isSteamCruelModeUnlockAvailable({
      devGameMode,
      hasWonNormalGame,
    });
  const [cruelModeChecked, setCruelModeChecked] = useState(false);
  const checkboxRef = useRef<HTMLButtonElement>(null);
  const wasCheckedRef = useRef(false);
  const { triggerParticles, portal: cruelBurstPortal } = useInlineButtonParticles(
    CRUEL_MODE_ACTIVATE_PARTICLE_CONFIG,
    {
      zIndex: CRUEL_MODE_CHECK_PARTICLE_Z,
      portalTarget: typeof document !== "undefined" ? document.body : null,
    },
  );

  const emitCruelBurst = useCallback(() => {
    const el = checkboxRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    triggerParticles({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    audioManager.playSound("makeFire", CRUEL_MODE_ACTIVATE_VOLUME);
  }, [triggerParticles]);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setCruelModeChecked(showCruelCheckbox && preferCruelMode);
    }
    if (!isOpen) {
      wasCheckedRef.current = false;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, preferCruelMode, showCruelCheckbox]);

  useEffect(() => {
    if (!isOpen) return;
    if (!cruelModeChecked) {
      wasCheckedRef.current = false;
      return;
    }
    if (wasCheckedRef.current) return;
    wasCheckedRef.current = true;
    const frame = requestAnimationFrame(() => emitCruelBurst());
    return () => cancelAnimationFrame(frame);
  }, [isOpen, cruelModeChecked, emitCruelBurst]);

  const cruelSymbol = SHOP_ITEMS.cruel_mode.symbol ?? "⛤";
  const cruelSymbolClass =
    SHOP_ITEMS.cruel_mode.symbolColor ?? "text-red-500";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="[--adc-dialog-max-w:28rem] z-[70]">
        <DialogHeader>
          <DialogTitle className="leading-6">{t("restart.title")}</DialogTitle>
        </DialogHeader>

        <DialogDescription asChild className="py-2">
          <div className="w-full text-center">
            <div className="w-full rounded-lg border border-red-600/50 bg-red-600/5 p-3">
              <p className="text-md font-medium text-red-600">
                {isSteamEdition || showCruelCheckbox
                  ? t("restart.warning")
                  : t("restart.warningWeb", {
                    defaultValue:
                      "Starting a new game will erase your current progress and reset all achievements except Epic Achievements.",
                  })}
              </p>
            </div>
            {showCruelCheckbox && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-foreground">
                <Checkbox
                  ref={checkboxRef}
                  id="restart-cruel-mode"
                  checked={cruelModeChecked}
                  onCheckedChange={(checked) =>
                    setCruelModeChecked(checked === true)
                  }
                  className="h-5 w-5 data-[state=checked]:bg-transparent data-[state=checked]:text-red-500"
                >
                  <span
                    className={`text-base leading-none ${cruelSymbolClass}`}
                    aria-hidden="true"
                  >
                    {cruelSymbol}
                  </span>
                </Checkbox>
                <label htmlFor="restart-cruel-mode" className="cursor-pointer">
                  {t("restart.cruelMode", { defaultValue: "Cruel Mode" })}
                </label>
              </div>
            )}
            {cruelBurstPortal}
          </div>
        </DialogDescription>

        <DialogFooter className="grid w-full grid-cols-2 gap-2 sm:space-x-0">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
            button_id="restart-cancel"
          >
            {t("restart.cancel")}
          </Button>
          <Button
            onClick={() =>
              onConfirm(
                showCruelCheckbox ? { cruelMode: cruelModeChecked } : undefined,
              )
            }
            variant="destructive"
            className="w-full"
            button_id="restart-confirm"
          >
            {t("restart.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
