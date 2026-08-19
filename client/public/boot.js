/**
 * Early boot helpers: cache-bust retry, load watchdog.
 * Loaded with defer from index.html so it does not block HTML parsing.
 * Watchdog timeout must match FATAL_UI_TIMEOUT_MS in client/src/lib/fatalErrorScreen.ts (45000).
 */
(function () {
  var RETRY_KEY = "adc_module_load_retry";

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
    var host = document.createElement("div");
    host.id = "adc-fatal-error";
    host.setAttribute("role", "alert");
    host.setAttribute("aria-live", "assertive");
    host.innerHTML =
      '<div style="position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2rem;padding:1.5rem;background:#000;color:#a3a3a3;font-family:ui-sans-serif,system-ui,sans-serif;text-align:center;">' +
      '<span class="adc-page-load-spinner" aria-hidden="true"><span class="adc-page-load-spinner__ring"></span><span class="adc-page-load-spinner__core"><img class="adc-page-load-spinner__logo" src="/apple-touch-icon.png" alt="" /></span></span>' +
      '<p data-adc-fatal-message style="max-width:24rem;margin:0;font-size:0.875rem;line-height:1.625;color:#a3a3a3;">We are digging deeper. Please check back soon.</p>' +
      '<button type="button" id="adc-fatal-error-reload" style="border:1px solid #525252;border-radius:0.25rem;padding:0.5rem 1rem;background:transparent;color:#e5e5e5;font-size:0.875rem;cursor:pointer;">Reload game</button>' +
      "</div>";
    document.body.appendChild(host);
    var btn = document.getElementById("adc-fatal-error-reload");
    if (btn) {
      btn.addEventListener("click", function () {
        try {
          // User-initiated reload gets another automatic chunk-retry chance.
          sessionStorage.removeItem(RETRY_KEY);
        } catch (e) { }
        try {
          var retryUrl = new URL(window.location.href);
          retryUrl.searchParams.set("_cb", String(Date.now()));
          location.replace(retryUrl.toString());
        } catch (e) {
          location.reload();
        }
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
