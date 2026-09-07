import { isStaticDocumentPath } from "@shared/staticDocumentPath";

declare global {
  interface Window {
    __ADC_APP_MOUNTED?: boolean;
    __ADC_BOOT_WATCHDOG?: ReturnType<typeof setTimeout>;
  }
}

/**
 * HTML for FAQ / About / Press / legal already has the page body.
 * Do not download or run the game SPA on those URLs.
 */
if (isStaticDocumentPath(window.location.pathname)) {
  document.getElementById("adc-boot-spinner")?.remove();
  try {
    window.__ADC_APP_MOUNTED = true;
    if (window.__ADC_BOOT_WATCHDOG !== undefined) {
      clearTimeout(window.__ADC_BOOT_WATCHDOG);
      window.__ADC_BOOT_WATCHDOG = undefined;
    }
  } catch {
    // ignore
  }
} else {
  void import("./bootApp");
}
