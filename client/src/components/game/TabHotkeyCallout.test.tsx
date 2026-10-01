/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TabHotkeyCallout from "./TabHotkeyCallout";

function rect(left: number, width: number, bottom = 40): DOMRect {
  return {
    x: left,
    y: bottom - 20,
    left,
    right: left + width,
    top: bottom - 20,
    bottom,
    width,
    height: 20,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

describe("TabHotkeyCallout", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("puts the hint inside the bordered box, including locked demo tabs", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) =>
        ({
          matches: query.includes("768"),
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const id = this.getAttribute("data-testid");
        if (id === "tab-cave") return rect(100, 40);
        if (id === "tab-village") return rect(160, 50);
        if (id === "tab-forest-locked") return rect(230, 48);
        return rect(80, 220, 48);
      },
    );

    const tabRowRef = { current: null as HTMLDivElement | null };
    render(
      <nav>
        <div
          ref={(node) => {
            tabRowRef.current = node;
          }}
        >
          <button type="button" data-testid="tab-cave">
            Cave
          </button>
          <button type="button" data-testid="tab-village">
            Village
          </button>
          <button type="button" data-testid="tab-forest-locked">
            Forest
          </button>
        </div>
        <TabHotkeyCallout
          tabRowRef={tabRowRef}
          tabs={["cave", "village", "forest"]}
          testId="village-hotkey-tutorial-box"
          dismissTestId="village-hotkey-tutorial-dismiss"
          dismissLabel="Dismiss"
          onDismiss={() => {}}
        >
          press 1-3
        </TabHotkeyCallout>
      </nav>,
    );

    const box = screen.getByTestId("village-hotkey-tutorial-box");
    const hint = screen.getByTestId("tab-hotkey-hint");
    expect(box.className).toContain("border");
    expect(box.className).toContain("border-red-500");
    expect(box.contains(hint)).toBe(true);
    expect(hint.textContent).toContain("press 1-3");
    expect(box.textContent).toContain("[1]");
    expect(box.textContent).toContain("[2]");
    expect(box.textContent).toContain("[3]");
  });
});
