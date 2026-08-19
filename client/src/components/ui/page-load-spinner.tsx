import { useEffect, useLayoutEffect } from "react";
import { mountFatalErrorScreen, FATAL_UI_TIMEOUT_MS } from "@/lib/fatalErrorScreen";
import { tryOneModuleLoadRecovery } from "@/lib/hardReload";
import { publicUrl } from "@/lib/publicUrl";

const BOOT_SPINNER_ID = "adc-boot-spinner";

/** Survives Suspense → route swaps so the last spinner still owns dismiss. */
let mountedSpinnerCount = 0;

declare global {
  interface Window {
    __ADC_BOOT_SPINNER_TIMER?: ReturnType<typeof setTimeout>;
  }
}

type PageLoadSpinnerProps = {
  /** After this many ms still mounted, show the fatal error screen (default FATAL_UI_TIMEOUT_MS). Pass 0 to disable. */
  escalateAfterMs?: number;
};

/** Clear the HTML boot spinner (safe to call repeatedly). */
export function dismissBootSpinner(): void {
  if (typeof window === "undefined") return;
  if (window.__ADC_BOOT_SPINNER_TIMER !== undefined) {
    clearTimeout(window.__ADC_BOOT_SPINNER_TIMER);
    window.__ADC_BOOT_SPINNER_TIMER = undefined;
  }
  document.getElementById(BOOT_SPINNER_ID)?.remove();
}

/**
 * Full-viewport black loading screen with a fire-colored CSS spinner.
 * Visible immediately. Decorative only — does not replace SEO fallback
 * content in index.html.
 * Hands off `#adc-boot-spinner` from index.html after this ring is in the DOM
 * so a cold load never goes black between the two.
 * Escalates to the fatal error screen if still mounted after escalateAfterMs.
 * No Framer/particle imports: this module is on the `/` Suspense path.
 */
export default function PageLoadSpinner({
  escalateAfterMs = FATAL_UI_TIMEOUT_MS,
}: PageLoadSpinnerProps = {}) {
  useLayoutEffect(() => {
    dismissBootSpinner();
  }, []);

  useEffect(() => {
    mountedSpinnerCount += 1;
    return () => {
      mountedSpinnerCount -= 1;
      if (mountedSpinnerCount <= 0) {
        mountedSpinnerCount = 0;
        dismissBootSpinner();
      }
    };
  }, []);

  useEffect(() => {
    if (!escalateAfterMs || escalateAfterMs <= 0) return;
    const timer = setTimeout(() => {
      const stuck = new Error(
        `Page load spinner still mounted after ${escalateAfterMs}ms`,
      );
      // Hung Suspense (chunk never settles) after a deploy: try one hard reload
      // before showing dig-deeper. Shares the stale-chunk sessionStorage guard.
      if (tryOneModuleLoadRecovery(stuck)) return;
      mountFatalErrorScreen(stuck);
    }, escalateAfterMs);
    return () => clearTimeout(timer);
  }, [escalateAfterMs]);

  return (
    <>
      <div
        className="fixed inset-0 bg-black"
        style={{ zIndex: 0 }}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading"
      />
      <div
        className="pointer-events-none fixed inset-0 flex items-center justify-center"
        style={{ zIndex: 2 }}
        aria-hidden="true"
        data-testid="page-load-spinner"
      >
        <span className="adc-page-load-spinner">
          <span className="adc-page-load-spinner__ring" />
          <span className="adc-page-load-spinner__core">
            <img
              className="adc-page-load-spinner__logo"
              src={publicUrl("/apple-touch-icon.png")}
              alt=""
            />
          </span>
        </span>
      </div>
    </>
  );
}
