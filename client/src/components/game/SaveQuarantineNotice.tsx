import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  consumeSaveQuarantineNotice,
  SAVE_QUARANTINE_NOTICE_KEY,
} from "@/game/save";
import { Z_INDEX } from "@/lib/z-index";

/**
 * Shown when the active save could not be decoded and was moved aside.
 * Not a modal: the new game keeps running, and this does not pause the sim.
 */
export default function SaveQuarantineNotice() {
  const { t } = useTranslation("ui");
  // Read only. Strict Mode runs initializers twice, so consuming here would hide the notice.
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(SAVE_QUARANTINE_NOTICE_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (!open) return null;

  return (
    <div
      role="status"
      data-testid="save-quarantine-notice"
      className="fixed left-1/2 top-3 w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2 border border-neutral-600 bg-black/90 px-3 py-3 text-center text-sm leading-relaxed text-neutral-300"
      style={{ zIndex: Z_INDEX.toast }}
    >
      <p className="m-0">
        {t("errorScreen.saveKept", {
          defaultValue:
            "The last save could not be opened, so this is a new game. The old save is still on this device.",
        })}
      </p>
      <button
        type="button"
        className="mt-2 border border-neutral-600 bg-transparent px-3 py-1 text-neutral-200"
        onClick={() => {
          consumeSaveQuarantineNotice();
          setOpen(false);
        }}
      >
        {t("errorScreen.saveKeptDismiss", { defaultValue: "Continue" })}
      </button>
    </div>
  );
}
