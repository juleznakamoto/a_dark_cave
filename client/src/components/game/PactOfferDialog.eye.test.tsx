/**
 * @vitest-environment jsdom
 */
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PactOfferEye, pactOfferViewportStyle } from "./PactOfferDialog";

function eyeMask(): string {
  const eye = document.querySelector("span[aria-hidden='true']");
  if (!(eye instanceof HTMLElement)) throw new Error("missing eye");
  return eye.style.maskImage;
}

function installMedia(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: reduce,
      media: "",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

describe("PactOfferEye", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("closes a chosen eye for 300ms, then opens it again", () => {
    installMedia(false);
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.useFakeTimers();
    render(<PactOfferEye open />);
    expect(eyeMask()).toContain("precision_boost");

    act(() => {
      vi.advanceTimersByTime(9_999);
    });
    expect(eyeMask()).toContain("precision_boost");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(eyeMask()).toContain("cracked_eye");

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(eyeMask()).toContain("cracked_eye");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(eyeMask()).toContain("precision_boost");
  });

  it("keeps an unchosen eye closed", () => {
    installMedia(false);
    vi.useFakeTimers();
    render(<PactOfferEye open={false} />);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(eyeMask()).toContain("cracked_eye");
  });
});

describe("pactOfferViewportStyle", () => {
  const layout = { width: 1280, height: 800 };

  it("keeps a matching window on the layout viewport", () => {
    expect(
      pactOfferViewportStyle(
        { offsetTop: 0, offsetLeft: 0, width: 1280, height: 800 },
        layout,
      ),
    ).toBeUndefined();
  });

  it("ignores a few pixels of fractional-scale rounding", () => {
    expect(
      pactOfferViewportStyle(
        { offsetTop: 0, offsetLeft: 0, width: 1278, height: 797 },
        layout,
      ),
    ).toBeUndefined();
  });

  it("pins the shell when the visible window is shorter than the layout viewport", () => {
    expect(
      pactOfferViewportStyle(
        { offsetTop: 40, offsetLeft: 0, width: 1280, height: 520 },
        layout,
      ),
    ).toMatchObject({
      top: 40,
      left: 0,
      width: 1280,
      height: 520,
      maxHeight: 520,
      bottom: "auto",
    });
  });

  it("ignores a missing or empty visual viewport", () => {
    expect(pactOfferViewportStyle(null, layout)).toBeUndefined();
    expect(
      pactOfferViewportStyle(
        { offsetTop: 0, offsetLeft: 0, width: 0, height: 0 },
        layout,
      ),
    ).toBeUndefined();
  });
});
