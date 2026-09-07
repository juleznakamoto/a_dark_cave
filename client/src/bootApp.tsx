import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import {
  ensureInitialLocalesLoaded,
  isStartupSurfacePath,
} from "./i18n/loadLocaleResources";
import App from "./App";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { mountFatalErrorScreen } from "@/lib/fatalErrorScreen";
import "./index.css";
import { initTextScaleFromStorage } from "./lib/textScale";
import { initTabVisibilityClass } from "./lib/tabVisibility";
import { installSuppressReplitFragmentWarnings } from "./lib/suppressReplitFragmentWarnings";
import {
  bootstrapAfterHardReload,
  installStaleChunkAutoReload,
  isStaleChunkLoadFailure,
  recoverFromStaleChunkLoad,
} from "./lib/hardReload";
import { logger } from "./lib/logger";
import { BOOT_LOCALE_TIMEOUT_MS } from "./lib/fatalErrorScreen";
import { isCrazyGamesBuild } from "./lib/edition";
import { hasCrazyGamesSdk } from "./lib/crazyGames";
import { installFlushSaveOnExit } from "./game/flushSaveOnExit";
import { persistLandingReferralCode } from "./game/referralLanding";

bootstrapAfterHardReload();
installStaleChunkAutoReload();
persistLandingReferralCode();

installSuppressReplitFragmentWarnings();
initTextScaleFromStorage();
initTabVisibilityClass();
installFlushSaveOnExit();

// Workaround for Google Translate (and similar) mutating text nodes, which
// leaves React reconciliation pointing at nodes whose real parent has changed.
// See facebook/react#11538. Swallow the two NotFoundError cases by delegating
// to the actual parentNode when it differs.
if (typeof Node === "function" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        return originalRemoveChild.call(child.parentNode, child) as T;
      }
      return child;
    }
    return originalRemoveChild.apply(this, [child] as unknown as [Node]) as T;
  } as typeof Node.prototype.removeChild;

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (referenceNode.parentNode) {
        return originalInsertBefore.call(
          referenceNode.parentNode,
          newNode,
          referenceNode,
        ) as T;
      }
      return this.appendChild(newNode) as T;
    }
    return originalInsertBefore.apply(this, [
      newNode,
      referenceNode,
    ] as unknown as [Node, Node | null]) as T;
  } as typeof Node.prototype.insertBefore;
}

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  // Vite preload failures are always missing/stale chunks after a deploy.
  const payload = (event as Event & { payload?: unknown }).payload;
  recoverFromStaleChunkLoad(
    isStaleChunkLoadFailure(payload)
      ? payload
      : new Error("Failed to fetch dynamically imported module (vite preload)"),
  );
});

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function markAppMounted(): void {
  try {
    (window as Window & { __ADC_APP_MOUNTED?: boolean }).__ADC_APP_MOUNTED = true;
    if (window.__ADC_BOOT_WATCHDOG !== undefined) {
      clearTimeout(window.__ADC_BOOT_WATCHDOG);
      window.__ADC_BOOT_WATCHDOG = undefined;
    }
  } catch {
    // ignore
  }
}

declare global {
  interface Window {
    __ADC_APP_MOUNTED?: boolean;
    __ADC_BOOT_WATCHDOG?: ReturnType<typeof setTimeout>;
    __ADC_FATAL_ERROR_SHOWN?: boolean;
  }
}

async function mountApp(): Promise<void> {
  if (isCrazyGamesBuild || hasCrazyGamesSdk()) {
    try {
      const { prepareCrazyGamesStartup } = await import(
        "./game/crazyGamesSaveAdapter"
      );
      await prepareCrazyGamesStartup();
    } catch (error) {
      logger.warn("[boot] CrazyGames persist prepare failed:", error);
    }
  }

  createRoot(document.getElementById("root")!).render(
    <AppErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </I18nextProvider>
    </AppErrorBoundary>,
  );
  markAppMounted();
}

void mountApp();

void withTimeout(
  ensureInitialLocalesLoaded(),
  BOOT_LOCALE_TIMEOUT_MS,
  "Initial locale load",
).catch((error) => {
  logger.error("[boot] Failed to load initial locales:", error);
  // Start surfaces already have English shell/seo seeded in i18n.init.
  if (!isStartupSurfacePath(window.location.pathname)) {
    mountFatalErrorScreen(error);
  }
});
