/**
 * Early boot helpers: cache-bust retry, load watchdog.
 * Loaded with defer from index.html so it does not block HTML parsing.
 * Watchdog timeout must match FATAL_UI_TIMEOUT_MS in client/src/lib/fatalErrorScreen.ts (45000).
 */
(function () {
  var RETRY_KEY = "adc_module_load_retry";
  // Keep in sync with fatalErrorScreen.ts and startupBootSurface.ts.
  var FATAL_SHOWN_COUNT_KEY = "adc_fatal_shown_count";
  var PREFER_START_KEY = "adc-prefer-start-screen";
  var RESUME_GAME_KEY = "adc-resume-game";

  try {
    var u = new URL(window.location.href);
    if (u.searchParams.has("_cb")) {
      u.searchParams.delete("_cb");
      history.replaceState(
        {},
        document.title,
        u.pathname + (u.search ? u.search : "") + (u.hash || ""),
      );
    }
  } catch (e) { }

  window.addEventListener(
    "error",
    function (event) {
      var target = event.target;
      if (!target || target.tagName !== "SCRIPT") return;
      var src = target.src || "";
      if (target.type !== "module" && !/\.js(\?|$)/i.test(src)) return;
      try {
        if (sessionStorage.getItem(RETRY_KEY)) {
          showBootFatalError();
          return;
        }
        sessionStorage.setItem(RETRY_KEY, String(Date.now()));
      } catch (err) {
        showBootFatalError();
        return;
      }
      try {
        var retryUrl = new URL(window.location.href);
        retryUrl.searchParams.set("_cb", String(Date.now()));
        location.replace(retryUrl.toString());
      } catch (err2) {
        showBootFatalError();
      }
    },
    true,
  );

  function readFatalShownCount() {
    try {
      var count = Number(sessionStorage.getItem(FATAL_SHOWN_COUNT_KEY));
      return isFinite(count) && count > 0 ? Math.floor(count) : 0;
    } catch (e) {
      return 0;
    }
  }

  function noteFatalScreenShown() {
    var next = readFatalShownCount() + 1;
    try {
      sessionStorage.setItem(FATAL_SHOWN_COUNT_KEY, String(next));
    } catch (e) { }
    return next;
  }

  /** Title next time, including editions that skip Make Fire when a save exists. */
  function markFatalEscapeToTitle() {
    try {
      sessionStorage.setItem(PREFER_START_KEY, "1");
      sessionStorage.removeItem(RESUME_GAME_KEY);
    } catch (e) { }
  }

  function fatalRecoveryUrl(clearRetry) {
    markFatalEscapeToTitle();
    if (clearRetry) {
      try {
        sessionStorage.removeItem(RETRY_KEY);
      } catch (e) { }
    }
    var retryUrl = new URL(window.location.href);
    if (retryUrl.hash.indexOf("#/") === 0) {
      retryUrl.hash = "#/";
      retryUrl.search = "";
    } else if ((retryUrl.pathname || "/") !== "/" && retryUrl.pathname.indexOf(".") === -1) {
      retryUrl.pathname = "/";
      retryUrl.search = "";
    } else {
      retryUrl.search = "";
    }
    retryUrl.searchParams.set("_cb", String(Date.now()));
    return retryUrl;
  }

  function purgeCachesThen(done) {
    var pending = 0;
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      done();
    }
    var timer = setTimeout(finish, 1500);
    function tick() {
      pending -= 1;
      if (pending <= 0) {
        clearTimeout(timer);
        finish();
      }
    }
    try {
      if (window.caches && caches.keys) {
        pending += 1;
        caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (key) { return caches.delete(key); }));
        }).then(tick, tick);
      }
    } catch (e) { }
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        pending += 1;
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (reg) { return reg.unregister(); }));
        }).then(tick, tick);
      }
    } catch (e2) { }
    if (pending === 0) {
      clearTimeout(timer);
      finish();
    }
  }

  function showBootFatalError() {
    if (document.getElementById("adc-fatal-error")) return;
    try {
      window.__ADC_FATAL_ERROR_SHOWN = true;
    } catch (e) { }
    var boot = document.getElementById("adc-boot-spinner");
    if (boot) boot.remove();
    if (window.__ADC_BOOT_SPINNER_TIMER !== undefined) {
      clearTimeout(window.__ADC_BOOT_SPINNER_TIMER);
      window.__ADC_BOOT_SPINNER_TIMER = undefined;
    }
    var repeat = noteFatalScreenShown() >= 2;
    var buttonStyle = "border:1px solid #525252;border-radius:0.25rem;padding:0.5rem 1rem;background:transparent;color:#e5e5e5;font-size:0.875rem;cursor:pointer;";
    var message = repeat
      ? "Reloading did not bring the fire back. You can return to the cave and make fire again."
      : "We are digging deeper. Please check back soon.";
    var host = document.createElement("div");
    host.id = "adc-fatal-error";
    host.setAttribute("role", "alert");
    host.setAttribute("aria-live", "assertive");
    host.innerHTML =
      '<div style="position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2rem;padding:1.5rem;background:#000;color:#a3a3a3;font-family:ui-sans-serif,system-ui,sans-serif;text-align:center;">' +
      '<span class="adc-page-load-spinner" aria-hidden="true"><span class="adc-page-load-spinner__ring"></span><span class="adc-page-load-spinner__core"><img class="adc-page-load-spinner__logo" src="/apple-touch-icon.png" alt="" /></span></span>' +
      '<p data-adc-fatal-message style="max-width:24rem;margin:0;font-size:0.875rem;line-height:1.625;color:#a3a3a3;">' + message + "</p>" +
      '<div style="display:flex;flex-wrap:wrap;gap:0.75rem;justify-content:center;">' +
      '<button type="button" id="adc-fatal-error-return"' + (repeat ? "" : " hidden") + ' style="' + buttonStyle + '">Return to the cave</button>' +
      '<button type="button" id="adc-fatal-error-reload" style="' + buttonStyle + '">Reload game</button>' +
      "</div></div>";
    document.body.appendChild(host);
    var reloadBtn = document.getElementById("adc-fatal-error-reload");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", function () {
        try {
          location.replace(fatalRecoveryUrl(true).toString());
        } catch (e) {
          location.reload();
        }
      });
    }
    var returnBtn = document.getElementById("adc-fatal-error-return");
    if (returnBtn) {
      returnBtn.addEventListener("click", function () {
        purgeCachesThen(function () {
          try {
            // Leave the one-shot retry spent so a broken script cannot auto-loop.
            location.replace(fatalRecoveryUrl(false).toString());
          } catch (e) {
            location.reload();
          }
        });
      });
    }
  }

  // Must match FATAL_UI_TIMEOUT_MS in client/src/lib/fatalErrorScreen.ts (45000).
  window.__ADC_BOOT_WATCHDOG = setTimeout(function () {
    window.__ADC_BOOT_WATCHDOG = undefined;
    if (window.__ADC_APP_MOUNTED || window.__ADC_FATAL_ERROR_SHOWN) return;
    showBootFatalError();
  }, 45000);
})();
