/** Exit-intent top bar from Playlight SDK (`role="menu"`) — inject a dismiss control. */

const EXIT_INTENT_BAR_SELECTOR = '.playlight-sdk [role="menu"]';
const CLOSE_BTN_CLASS = 'adc-playlight-exit-intent-close';
const HIDDEN_CLASS = 'adc-playlight-exit-intent-hidden';
const BAR_HOOK_CLASS = 'adc-playlight-exit-intent-bar';

/** Matches SDK auto-dismiss (~1500ms) so internal state can clear before re-show. */
const SDK_DISMISS_MS = 1600;

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

/** Full-width exit-intent banner (not the nested "MORE GAMES" menu). */
function resolveExitIntentHost(menu: HTMLElement): HTMLElement {
  let host: HTMLElement = menu;
  while (host.parentElement) {
    const parent = host.parentElement;
    if (
      parent.id === 'playlight-sdk-container' ||
      parent.classList.contains('playlight-sdk')
    ) {
      break;
    }
    host = parent;
  }
  return host;
}

function dismissExitIntentBar(host: HTMLElement): void {
  host.classList.add(HIDDEN_CLASS);
  document.dispatchEvent(
    new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }),
  );
  window.setTimeout(() => {
    host.classList.remove(HIDDEN_CLASS);
  }, SDK_DISMISS_MS);
}

/** Matches CooldownButton craft/build abort overlay (slightly larger). */
const ABORT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

function injectCloseButton(host: HTMLElement): void {
  if (host.querySelector(`.${CLOSE_BTN_CLASS}`)) return;

  host.classList.add(BAR_HOOK_CLASS);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = CLOSE_BTN_CLASS;
  btn.setAttribute('aria-label', 'Close');
  btn.innerHTML = ABORT_ICON_SVG;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dismissExitIntentBar(host);
  });

  host.appendChild(btn);
}

export function scanPlaylightExitIntentBar(): void {
  const menu = document.querySelector(EXIT_INTENT_BAR_SELECTOR);
  if (menu instanceof HTMLElement) {
    injectCloseButton(resolveExitIntentHost(menu));
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
