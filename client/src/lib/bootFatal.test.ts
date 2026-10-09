/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const BOOT_SOURCE = readFileSync(
  path.join(process.cwd(), "client/public/boot.js"),
  "utf8",
);

describe("boot.js fatal recovery", () => {
  const replace = vi.fn();

  beforeAll(() => {
    vi.stubGlobal("location", {
      href: "https://a-dark-cave.com/game?x=1",
      replace,
      reload: vi.fn(),
    });
    sessionStorage.clear();
    window.eval(BOOT_SOURCE);
    const bootWindow = window as Window & {
      __ADC_BOOT_WATCHDOG?: ReturnType<typeof setTimeout>;
    };
    clearTimeout(bootWindow.__ADC_BOOT_WATCHDOG);
    bootWindow.__ADC_BOOT_WATCHDOG = undefined;
  });

  afterAll(() => {
    const bootWindow = window as Window & {
      __ADC_BOOT_WATCHDOG?: ReturnType<typeof setTimeout>;
    };
    clearTimeout(bootWindow.__ADC_BOOT_WATCHDOG);
    sessionStorage.clear();
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  function failScript(src: string) {
    const script = document.createElement("script");
    script.type = "module";
    script.src = src;
    document.body.appendChild(script);
    script.dispatchEvent(new Event("error", { bubbles: true }));
  }

  it("retries a missing script once, then escapes to the title instead of looping", () => {
    failScript("https://a-dark-cave.com/assets/index-missing.js");

    expect(document.getElementById("adc-fatal-error")).toBeNull();
    expect(sessionStorage.getItem("adc_module_load_retry")).not.toBeNull();
    expect(replace).toHaveBeenCalledTimes(1);
    const firstUrl = new URL(String(replace.mock.calls[0][0]));
    expect(firstUrl.pathname).toBe("/game");
    expect(firstUrl.searchParams.has("_cb")).toBe(true);

    replace.mockClear();
    failScript("https://a-dark-cave.com/assets/index-missing.js");

    const message = document.querySelector("[data-adc-fatal-message]")?.textContent ?? "";
    expect(message).toContain("digging deeper");
    expect(document.getElementById("adc-fatal-error-return")?.hasAttribute("hidden")).toBe(
      true,
    );
    expect(sessionStorage.getItem("adc_fatal_shown_count")).toBe("1");

    document.getElementById("adc-fatal-error-reload")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    const reloadUrl = new URL(String(replace.mock.calls[0][0]));
    expect(reloadUrl.pathname).toBe("/");
    expect(reloadUrl.searchParams.get("x")).toBeNull();
    expect(reloadUrl.searchParams.has("_cb")).toBe(true);
    expect(sessionStorage.getItem("adc_module_load_retry")).toBeNull();
    expect(sessionStorage.getItem("adc-prefer-start-screen")).toBe("1");
    expect(sessionStorage.getItem("adc-resume-game")).toBeNull();

    document.getElementById("adc-fatal-error")?.remove();
    sessionStorage.setItem("adc_module_load_retry", "1");
    (window.location as { href: string }).href =
      "https://files.example/wrap/index.html#/boost";
    replace.mockClear();
    failScript("https://files.example/assets/index-missing.js");

    const repeat = document.querySelector("[data-adc-fatal-message]")?.textContent ?? "";
    expect(repeat).toContain("make fire again");
    expect(repeat).not.toContain("light");
    const returnButton = document.getElementById("adc-fatal-error-return");
    expect(returnButton?.hasAttribute("hidden")).toBe(false);

    returnButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const returnUrl = new URL(String(replace.mock.calls[0][0]));
    expect(returnUrl.pathname).toBe("/wrap/index.html");
    expect(returnUrl.hash).toBe("#/");
    expect(returnUrl.searchParams.has("_cb")).toBe(true);
    expect(sessionStorage.getItem("adc_module_load_retry")).toBe("1");
  });
});
