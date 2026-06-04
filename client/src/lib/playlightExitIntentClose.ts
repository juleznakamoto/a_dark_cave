/**
 * Exit-intent banner from the Playlight SDK — inject a dismiss control.
 *
 * The SDK renders the banner as `<div role="menu" class="bg-background/85 fixed ... overflow-hidden p-4">`
 * (heading + "More games" group inside it). That `[role="menu"]` node IS the banner, so we attach the
 * close button directly to it; center the circle on the top-right corner with `translate(50%, -50%)`.
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
 * Close the banner. The SDK only unmounts it (`u=false`) ~1500ms after a `mousemove` whose target is
 * outside the banner — and a `mouseenter` on the banner cancels that timer. Since the cursor sits on
 * the banner after the click, we hide it instantly with inline `display:none !important` (so the SDK's
 * `mouseenter` can't re-arm and no stylesheet can override it), keep exit intent enabled so the SDK
 * handler still runs, then dispatch a `mousemove` on `document.body` (a real Node — dispatching on
 * `window` makes the SDK's `banner.contains(e.target)` throw) so the SDK resets `u=false` for the next
 * show. We never un-hide: the SDK builds a fresh node when it shows again.
 */
function dismissExitIntentBanner(): void {
  const banner = document.querySelector(EXIT_INTENT_BAR_SELECTOR);
  if (banner instanceof HTMLElement) {
    banner.classList.add(HIDDEN_CLASS);
    banner.style.setProperty('display', 'none', 'important');
  }
  try {
    const sdk = (window as unknown as { playlightSDK?: { setConfig?: (c: unknown) => void } })
      .playlightSDK;
    sdk?.setConfig?.({ exitIntent: { enabled: true, immediate: false } });
  } catch {
    /* ignore */
  }
  document.body.dispatchEvent(
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

  // Center the circle on the banner's top-right corner (translate offsets by half width/height).
  banner.style.setProperty('overflow', 'visible', 'important');
  btn.style.setProperty('position', 'absolute', 'important');
  btn.style.setProperty('top', '0', 'important');
  btn.style.setProperty('right', '0', 'important');
  btn.style.setProperty('left', 'auto', 'important');
  btn.style.setProperty('bottom', 'auto', 'important');
  btn.style.setProperty('margin', '0', 'important');
  btn.style.setProperty('transform', 'translate(50%, -50%)', 'important');
  btn.style.setProperty('z-index', '40', 'important');
  btn.style.setProperty('pointer-events', 'auto', 'important');

  banner.appendChild(btn);
}

export function scanPlaylightExitIntentBar(): void {
  const banner = document.querySelector(EXIT_INTENT_BAR_SELECTOR);
  if (banner instanceof HTMLElement) {
    injectCloseButton(banner);
  }
}

/**
 * Capture-phase click delegation on the persistent SDK root. The banner node is re-rendered by the
 * SDK, so a listener bound to a specific button instance can be lost; delegation survives re-renders
 * and runs before the SDK's own handlers.
 */
function handleRootClickCapture(e: MouseEvent): void {
  const target = e.target as Element | null;
  if (!target?.closest(`.${CLOSE_BTN_CLASS}`)) return;
  e.preventDefault();
  e.stopPropagation();
  dismissExitIntentBanner();
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
    const delegated = root as HTMLElement & { __adcCloseDelegated?: boolean };
    if (!delegated.__adcCloseDelegated) {
      root.addEventListener('click', handleRootClickCapture as EventListener, true);
      root.addEventListener('pointerdown', (ev) => {
        if ((ev.target as Element | null)?.closest(`.${CLOSE_BTN_CLASS}`)) {
          ev.stopPropagation();
        }
      }, true);
      delegated.__adcCloseDelegated = true;
    }
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
