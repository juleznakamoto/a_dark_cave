import {
  clearResumeGame,
  setPreferStartScreen,
} from "@/game/startupBootSurface";
import { publicUrl } from "./publicUrl";

/** Shared fatal-UI timings (keep index.html boot watchdog in sync: 45000). */
export const BOOT_LOCALE_TIMEOUT_MS = 20_000;
/** Stuck loading / never-mounted React escalate after this. */
export const FATAL_UI_TIMEOUT_MS = 45_000;

/** Hardcoded English on purpose when i18n is unavailable. */
export const ERROR_SCREEN_MESSAGE =
  "We are digging deeper. Please check back soon.";
export const ERROR_SCREEN_RELOAD = "Reload game";
export const ERROR_SCREEN_REPEAT_MESSAGE =
  "Reloading did not bring the fire back. You can return to the cave and make fire again.";
export const ERROR_SCREEN_RETURN = "Return to the cave";
export const FATAL_ERROR_ROOT_ID = "adc-fatal-error";

/**
 * How many times this tab has shown the fatal screen.
 * Keep in sync with `public/boot.js` (`FATAL_SHOWN_COUNT_KEY`).
 * The second show changes the primary action so Reload is not the only way out.
 */
export const FATAL_SHOWN_COUNT_KEY = "adc_fatal_shown_count";

type ErrorCopy = {
  message: string;
  reload: string;
  repeatMessage: string;
  returnToCave: string;
};

const ENGLISH_COPY: ErrorCopy = {
  message: ERROR_SCREEN_MESSAGE,
  reload: ERROR_SCREEN_RELOAD,
  repeatMessage: ERROR_SCREEN_REPEAT_MESSAGE,
  returnToCave: ERROR_SCREEN_RETURN,
};

export function readFatalShownCount(): number {
  try {
    const count = Number(sessionStorage.getItem(FATAL_SHOWN_COUNT_KEY));
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  } catch {
    return 0;
  }
}

/** True once Reload has already failed to get the player into the game. */
export function isRepeatFatalScreen(count = readFatalShownCount()): boolean {
  return count >= 2;
}

function noteFatalScreenShown(): number {
  const next = readFatalShownCount() + 1;
  try {
    sessionStorage.setItem(FATAL_SHOWN_COUNT_KEY, String(next));
  } catch {
    // ignore
  }
  return next;
}

/**
 * Next boot is the title, including Steam, where a started save would
 * otherwise skip Make Fire and open the same crash again.
 */
export function markFatalEscapeToTitle(): void {
  setPreferStartScreen();
  clearResumeGame();
}

function isUsableTranslation(value: unknown, key: string): value is string {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    value !== key &&
    value !== `ui:${key}`
  );
}

function applyCopyToHost(
  host: HTMLElement,
  copy: ErrorCopy,
  repeat: boolean,
): void {
  const messageEl = host.querySelector("[data-adc-fatal-message]");
  const reloadEl = host.querySelector("#adc-fatal-error-reload");
  const returnEl = host.querySelector("#adc-fatal-error-return");
  if (messageEl) {
    messageEl.textContent = repeat ? copy.repeatMessage : copy.message;
  }
  if (reloadEl) reloadEl.textContent = copy.reload;
  if (returnEl instanceof HTMLElement) {
    returnEl.textContent = copy.returnToCave;
    if (repeat) returnEl.removeAttribute("hidden");
    else returnEl.setAttribute("hidden", "");
  }
}

function usableCopy(value: unknown, key: string, fallback: string): string {
  return isUsableTranslation(value, key) ? value : fallback;
}

/** Soft-upgrade copy once i18n is available (no-op if already English-only). */
function softUpgradeCopy(host: HTMLElement): void {
  const repeat = isRepeatFatalScreen();
  void import("@/i18n")
    .then((mod) => {
      const i18n = mod.default;
      const message = i18n.t("errorScreen.message", {
        ns: "ui",
        defaultValue: ENGLISH_COPY.message,
      });
      const repeatMessage = i18n.t("errorScreen.repeatMessage", {
        ns: "ui",
        defaultValue: ENGLISH_COPY.repeatMessage,
      });
      const reload = i18n.t("errorScreen.reload", {
        ns: "ui",
        defaultValue: ENGLISH_COPY.reload,
      });
      const returnToCave = i18n.t("errorScreen.returnToCave", {
        ns: "ui",
        defaultValue: ENGLISH_COPY.returnToCave,
      });
      applyCopyToHost(
        host,
        {
          message: usableCopy(message, "errorScreen.message", ENGLISH_COPY.message),
          repeatMessage: usableCopy(
            repeatMessage,
            "errorScreen.repeatMessage",
            ENGLISH_COPY.repeatMessage,
          ),
          reload: usableCopy(reload, "errorScreen.reload", ENGLISH_COPY.reload),
          returnToCave: usableCopy(
            returnToCave,
            "errorScreen.returnToCave",
            ENGLISH_COPY.returnToCave,
          ),
        },
        repeat,
      );
    })
    .catch(() => {
      // Keep English defaults when i18n is unavailable.
    });
}

function reloadFromFatalScreen(): Promise<void> {
  markFatalEscapeToTitle();
  return import("@/lib/hardReload").then(
    ({ hardReload, clearStaleChunkReloadGuard }) => {
      // One more automatic chunk retry on the title, not back inside the crash.
      clearStaleChunkReloadGuard();
      return hardReload({ resume: false, toTitle: true });
    },
  );
}

/** Reload, but land on the title instead of resuming the crashed game. */
export function triggerReload(): void {
  void reloadFromFatalScreen().catch(() => {
    try {
      try {
        sessionStorage.removeItem("adc_module_load_retry");
      } catch {
        // ignore
      }
      markFatalEscapeToTitle();
      const url = new URL(window.location.href);
      if (url.hash.startsWith("#/")) url.hash = "#/";
      else if ((url.pathname || "/") !== "/" && !url.pathname.includes(".")) {
        url.pathname = "/";
      }
      url.search = "";
      url.searchParams.set("_cb", Date.now().toString());
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  });
}

/**
 * Second chance after Reload already failed: drop cached bundles, then open
 * the title. Does not re-arm the automatic chunk retry, so a broken script
 * cannot bounce the player through another silent reload.
 */
export function triggerReturnToCave(): void {
  markFatalEscapeToTitle();
  void import("@/lib/hardReload")
    .then(async ({ hardReload, purgeStaleAppCaches }) => {
      await purgeStaleAppCaches();
      await hardReload({ resume: false, toTitle: true });
    })
    .catch(() => {
      triggerReload();
    });
}

/**
 * Game startup threw. Send the player to the title instead of the fatal
 * screen, which only offered Reload back into the same throw.
 */
export function escapeFailedGameBoot(): void {
  void reloadFromFatalScreen().catch(() => {
    mountFatalErrorScreen();
  });
}

export function dismissBootSpinnerDom(): void {
  if (typeof window === "undefined") return;
  if (window.__ADC_BOOT_SPINNER_TIMER !== undefined) {
    clearTimeout(window.__ADC_BOOT_SPINNER_TIMER);
    window.__ADC_BOOT_SPINNER_TIMER = undefined;
  }
  document.getElementById("adc-boot-spinner")?.remove();
}

const FATAL_BUTTON_STYLE =
  "border:1px solid #525252;border-radius:0.25rem;padding:0.5rem 1rem;background:transparent;color:#e5e5e5;font-size:0.875rem;cursor:pointer;";

function buildFatalErrorMarkup(copy: ErrorCopy, repeat: boolean): string {
  const message = repeat ? copy.repeatMessage : copy.message;
  const returnHidden = repeat ? "" : " hidden";
  return `
<div style="position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2rem;padding:1.5rem;background:#000;color:#a3a3a3;font-family:ui-sans-serif,system-ui,sans-serif;text-align:center;">
  <span class="adc-page-load-spinner" aria-hidden="true">
    <span class="adc-page-load-spinner__ring"></span>
    <span class="adc-page-load-spinner__core">
      <img class="adc-page-load-spinner__logo" src="${publicUrl("/apple-touch-icon.png")}" alt="" />
    </span>
  </span>
  <p data-adc-fatal-message style="max-width:24rem;margin:0;font-size:0.875rem;line-height:1.625;color:#a3a3a3;">${message}</p>
  <div style="display:flex;flex-wrap:wrap;gap:0.75rem;justify-content:center;">
    <button type="button" id="adc-fatal-error-return"${returnHidden} style="${FATAL_BUTTON_STYLE}">${copy.returnToCave}</button>
    <button type="button" id="adc-fatal-error-reload" style="${FATAL_BUTTON_STYLE}">${copy.reload}</button>
  </div>
</div>`;
}

/**
 * Imperative fatal UI that works without React.
 * Idempotent — safe to call from boot, global handlers, timeouts, and React.
 */
export function mountFatalErrorScreen(reason?: unknown): void {
  if (typeof document === "undefined") return;

  const existing = document.getElementById(FATAL_ERROR_ROOT_ID);
  if (existing) {
    softUpgradeCopy(existing);
    return;
  }

  try {
    void import("@/lib/logger").then(({ logger }) => {
      logger.error("[fatal] Showing error screen:", reason);
    });
  } catch {
    // ignore
  }

  dismissBootSpinnerDom();

  const shownCount = noteFatalScreenShown();
  const copy = ENGLISH_COPY;
  const host = document.createElement("div");
  host.id = FATAL_ERROR_ROOT_ID;
  host.setAttribute("role", "alert");
  host.setAttribute("aria-live", "assertive");
  host.innerHTML = buildFatalErrorMarkup(copy, isRepeatFatalScreen(shownCount));
  document.body.appendChild(host);

  host.querySelector("#adc-fatal-error-return")?.addEventListener("click", () => {
    triggerReturnToCave();
  });
  host.querySelector("#adc-fatal-error-reload")?.addEventListener("click", () => {
    triggerReload();
  });

  softUpgradeCopy(host);

  try {
    window.__ADC_FATAL_ERROR_SHOWN = true;
  } catch {
    // ignore
  }
}
