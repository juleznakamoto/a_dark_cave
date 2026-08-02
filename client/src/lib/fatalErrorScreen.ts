/** Shared fatal-UI timings (keep index.html boot watchdog in sync: 45000). */
export const BOOT_LOCALE_TIMEOUT_MS = 20_000;
/** Stuck loading / never-mounted React escalate after this. */
export const FATAL_UI_TIMEOUT_MS = 45_000;

/** Hardcoded English on purpose when i18n is unavailable. */
export const ERROR_SCREEN_MESSAGE =
  "We are digging deeper. Please check back soon.";
export const ERROR_SCREEN_RELOAD = "Reload game";
export const FATAL_ERROR_ROOT_ID = "adc-fatal-error";

type ErrorCopy = {
  message: string;
  reload: string;
};

const ENGLISH_COPY: ErrorCopy = {
  message: ERROR_SCREEN_MESSAGE,
  reload: ERROR_SCREEN_RELOAD,
};

function isUsableTranslation(value: unknown, key: string): value is string {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    value !== key &&
    value !== `ui:${key}`
  );
}

function applyCopyToHost(host: HTMLElement, copy: ErrorCopy): void {
  const messageEl = host.querySelector("[data-adc-fatal-message]");
  const reloadEl = host.querySelector("#adc-fatal-error-reload");
  if (messageEl) messageEl.textContent = copy.message;
  if (reloadEl) reloadEl.textContent = copy.reload;
}

/** Soft-upgrade copy once i18n is available (no-op if already English-only). */
function softUpgradeCopy(host: HTMLElement): void {
  void import("@/i18n")
    .then((mod) => {
      const i18n = mod.default;
      const message = i18n.t("errorScreen.message", {
        ns: "ui",
        defaultValue: ENGLISH_COPY.message,
      });
      const reload = i18n.t("errorScreen.reload", {
        ns: "ui",
        defaultValue: ENGLISH_COPY.reload,
      });
      applyCopyToHost(host, {
        message: isUsableTranslation(message, "errorScreen.message")
          ? message
          : ENGLISH_COPY.message,
        reload: isUsableTranslation(reload, "errorScreen.reload")
          ? reload
          : ENGLISH_COPY.reload,
      });
    })
    .catch(() => {
      // Keep English defaults when i18n is unavailable.
    });
}

/** Prefer hardReload when available; fall back to a plain cache-bust navigation. */
export function triggerReload(): void {
  void import("@/lib/hardReload")
    .then(({ hardReload, clearStaleChunkReloadGuard }) => {
      // User-initiated reload gets another automatic chunk-retry chance.
      clearStaleChunkReloadGuard();
      return hardReload();
    })
    .catch(() => {
      try {
        try {
          sessionStorage.removeItem("adc_module_load_retry");
        } catch {
          // ignore
        }
        const url = new URL(window.location.href);
        url.searchParams.set("_cb", Date.now().toString());
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
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

function buildFatalErrorMarkup(copy: ErrorCopy): string {
  return `
<div style="position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2rem;padding:1.5rem;background:#000;color:#a3a3a3;font-family:ui-sans-serif,system-ui,sans-serif;text-align:center;">
  <span class="adc-page-load-spinner" aria-hidden="true">
    <span class="adc-page-load-spinner__ring"></span>
    <span class="adc-page-load-spinner__core">
      <img class="adc-page-load-spinner__logo" src="/apple-touch-icon.png" alt="" />
    </span>
  </span>
  <p data-adc-fatal-message style="max-width:24rem;margin:0;font-size:0.875rem;line-height:1.625;color:#a3a3a3;">${copy.message}</p>
  <button type="button" id="adc-fatal-error-reload" style="border:1px solid #525252;border-radius:0.25rem;padding:0.5rem 1rem;background:transparent;color:#e5e5e5;font-size:0.875rem;cursor:pointer;">${copy.reload}</button>
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

  const copy = ENGLISH_COPY;
  const host = document.createElement("div");
  host.id = FATAL_ERROR_ROOT_ID;
  host.setAttribute("role", "alert");
  host.setAttribute("aria-live", "assertive");
  host.innerHTML = buildFatalErrorMarkup(copy);
  document.body.appendChild(host);

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
