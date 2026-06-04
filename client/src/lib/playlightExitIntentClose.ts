/** Exit-intent top bar from Playlight SDK (`role="menu"`) — inject a dismiss control. */

const EXIT_INTENT_BAR_SELECTOR = '.playlight-sdk [role="menu"]';
const CLOSE_BTN_CLASS = 'adc-playlight-exit-intent-close';
const HIDDEN_CLASS = 'adc-playlight-exit-intent-hidden';
const BAR_HOOK_CLASS = 'adc-playlight-exit-intent-bar';

/** Matches SDK auto-dismiss (~1500ms) so internal state can clear before re-show. */
const SDK_DISMISS_MS = 1600;

let observer: MutationObserver | null = null;

function dismissExitIntentBar(bar: HTMLElement): void {
  bar.classList.add(HIDDEN_CLASS);
  document.dispatchEvent(
    new MouseEvent('mousemove', { bubbles: true, clientX: 0, clientY: 0 }),
  );
  window.setTimeout(() => {
    bar.classList.remove(HIDDEN_CLASS);
  }, SDK_DISMISS_MS);
}

function injectCloseButton(bar: HTMLElement): void {
  if (bar.querySelector(`.${CLOSE_BTN_CLASS}`)) return;

  bar.classList.add(BAR_HOOK_CLASS);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = CLOSE_BTN_CLASS;
  btn.setAttribute('aria-label', 'Close');
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dismissExitIntentBar(bar);
  });

  bar.appendChild(btn);
}

export function scanPlaylightExitIntentBar(): void {
  const bar = document.querySelector(EXIT_INTENT_BAR_SELECTOR);
  if (bar instanceof HTMLElement) {
    injectCloseButton(bar);
  }
}

/**
 * Watches the Playlight mount node and adds a red close button to the exit-intent bar.
 * Call once after `playlightSDK.init()`.
 */
export function installPlaylightExitIntentCloseButton(): void {
  if (typeof document === 'undefined') return;

  const attach = (root: HTMLElement) => {
    if (observer) {
      observer.disconnect();
    }
    observer = new MutationObserver(() => scanPlaylightExitIntentBar());
    observer.observe(root, { childList: true, subtree: true });
    scanPlaylightExitIntentBar();
  };

  const existing = document.getElementById('playlight-sdk-container');
  if (existing) {
    attach(existing);
    return;
  }

  const bodyObserver = new MutationObserver(() => {
    const root = document.getElementById('playlight-sdk-container');
    if (root) {
      bodyObserver.disconnect();
      attach(root);
    }
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
}
