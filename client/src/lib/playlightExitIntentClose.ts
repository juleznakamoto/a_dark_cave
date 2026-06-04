/**
 * Exit-intent banner from the Playlight SDK — inject a dismiss control.
 *
 * The SDK renders the banner as `<div role="menu" class="bg-background/85 fixed ... overflow-hidden p-4">`
 * (heading + "More games" group inside it). That `[role="menu"]` node IS the banner, so we attach the
 * close button directly to it; it is `position: fixed`, which is the containing block for our absolute X.
 */

const EXIT_INTENT_BAR_SELECTOR = '.playlight-sdk [role="menu"]';
const CLOSE_BTN_CLASS = 'adc-playlight-exit-intent-close';
const HIDDEN_CLASS = 'adc-playlight-exit-intent-hidden';
const BAR_HOOK_CLASS = 'adc-playlight-exit-intent-bar';

let containerObserver: MutationObserver | null = null;
let bodyObserver: MutationObserver | null = null;

function disconnectBodyObserver(): void {
  if (bodyObserver) {
    bodyObserver.disconnect();
    bodyObserver = null;
  }
}

function disconnectContainerObserver(): void {
  if (containerObserver) {
    containerObserver.disconnect();
    containerObserver = null;
  }
}

/**
 * Close the banner. The SDK only drops it (`u=false`, which unmounts the node) ~1500ms after a
 * window `mousemove` whose target is outside the banner — but a `mouseenter` on the banner cancels
 * that timer. Since the cursor sits on the banner right after the click, we hide it first (so the
 * SDK's `mouseenter` can't re-arm), keep exit intent enabled so the SDK handler runs, then dispatch
 * the window `mousemove` that schedules the unmount. We do not un-hide: the SDK creates a fresh node
 * on the next show.
 */
function dismissExitIntentBanner(banner: HTMLElement): void {
  banner.classList.add(HIDDEN_CLASS);
  try {
    const sdk = (window as unknown as { playlightSDK?: { setConfig?: (c: unknown) => void } })
      .playlightSDK;
    sdk?.setConfig?.({ exitIntent: { enabled: true, immediate: false } });
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }),
  );
}

/** Matches CooldownButton craft/build abort overlay (slightly larger). */
const ABORT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

function injectCloseButton(banner: HTMLElement): void {
  if (banner.querySelector(`.${CLOSE_BTN_CLASS}`)) return;

  banner.classList.add(BAR_HOOK_CLASS);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = CLOSE_BTN_CLASS;
  btn.setAttribute('aria-label', 'Close');
  btn.innerHTML = ABORT_ICON_SVG;

  // Stop pointerdown/click reaching the SDK's banner handlers (which open "More games").
  btn.addEventListener('pointerdown', (e) => e.stopPropagation());
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dismissExitIntentBanner(banner);
  });

  banner.appendChild(btn);
}

export function scanPlaylightExitIntentBar(): void {
  const banner = document.querySelector(EXIT_INTENT_BAR_SELECTOR);
  if (banner instanceof HTMLElement) {
    injectCloseButton(banner);
  }
}

/**
 * Watches the Playlight mount node and adds an abort-style close on the exit-intent banner.
 * Call once after `playlightSDK.init()`.
 */
export function installPlaylightExitIntentCloseButton(): void {
  if (typeof document === 'undefined') return;

  const attach = (root: HTMLElement) => {
    disconnectBodyObserver();
    disconnectContainerObserver();
    containerObserver = new MutationObserver(() => scanPlaylightExitIntentBar());
    containerObserver.observe(root, { childList: true, subtree: true });
    scanPlaylightExitIntentBar();
  };

  const existing = document.getElementById('playlight-sdk-container');
  if (existing) {
    attach(existing);
    return;
  }

  disconnectBodyObserver();
  bodyObserver = new MutationObserver(() => {
    const root = document.getElementById('playlight-sdk-container');
    if (root) {
      attach(root);
    }
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
}
