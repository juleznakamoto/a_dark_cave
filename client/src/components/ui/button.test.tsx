/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { Button } from "./button";
import {
  DestroyedChromeScope,
  chromeRuleColorStyle,
} from "@/components/game/gameChrome";

const { trackButtonClick } = vi.hoisted(() => ({
  trackButtonClick: vi.fn(),
}));

vi.mock("@/game/state", () => ({
  useGameStore: {
    getState: () => ({
      trackButtonClick,
    }),
  },
}));

describe("Button click analytics", () => {
  beforeEach(() => {
    trackButtonClick.mockClear();
  });

  it("tracks button_id on a normal button", async () => {
    render(<Button button_id="footer-pause">Pause</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await vi.waitFor(() => {
      expect(trackButtonClick).toHaveBeenCalledWith("footer-pause");
    });
  });

  it("tracks button_id when asChild wraps an anchor and the click hits an inner child", async () => {
    render(
      <Button asChild button_id="demo-end-wishlist">
        <a href="https://example.com">
          <span>Wishlist</span>
        </a>
      </Button>,
    );
    fireEvent.click(screen.getByText("Wishlist"));
    await vi.waitFor(() => {
      expect(trackButtonClick).toHaveBeenCalledWith("demo-end-wishlist");
    });
  });

  it("does not track when button_id is missing", async () => {
    render(<Button>No id</Button>);
    fireEvent.click(screen.getByRole("button", { name: "No id" }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(trackButtonClick).not.toHaveBeenCalled();
  });
});

describe("Button destroyed outline chrome", () => {
  it("puts destroyed chrome on outline buttons", () => {
    render(
      <Button variant="outline" button_id="improve-sleep">
        Improve
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Improve" });
    expect(btn.className).toContain("game-chrome-rule--box");
    expect(btn.style.getPropertyValue("--adc-chrome-mask-x")).toMatch(/^\d+px$/);
  });

  it("leaves outline buttons solid inside out-of-game UI", () => {
    render(
      <DestroyedChromeScope allow={false}>
        <Button variant="outline" button_id="shop-buy">
          Buy
        </Button>
      </DestroyedChromeScope>,
    );
    const btn = screen.getByRole("button", { name: "Buy" });
    expect(btn.className).not.toContain("game-chrome-rule--box");
    expect(btn.style.getPropertyValue("--adc-chrome-mask-x")).toBe("");
  });

  it("leaves filled default buttons without box chrome", () => {
    render(<Button button_id="shop-claim">Claim</Button>);
    const btn = screen.getByRole("button", { name: "Claim" });
    expect(btn.className).not.toContain("game-chrome-rule--box");
    expect(btn.style.getPropertyValue("--adc-chrome-mask-x")).toBe("");
  });

  it("keeps cube-close radius and silver hairline without a 2px solid edge", () => {
    render(
      <Button
        variant="outline"
        size="sm"
        className="px-8 rounded-lg"
        style={chromeRuleColorStyle("#9ca3af")}
        button_id="cube-close-test"
      >
        Close
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Close" });
    expect(btn.className).toContain("game-chrome-rule--box");
    expect(btn.className).toContain("rounded-lg");
    expect(btn.style.getPropertyValue("--adc-chrome-rule-color")).toBe("#9ca3af");
    expect(btn.className).not.toMatch(/(^|\s)border-2(\s|$)/);
  });

  it("puts compact chrome on tiny outline buttons", () => {
    render(
      <Button variant="outline" compactChrome button_id="unassign-gatherer">
        -
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "-" });
    expect(btn.className).toContain("game-chrome-rule--box");
    expect(btn.className).toContain("game-chrome-rule--compact");
    expect(btn.style.getPropertyValue("--adc-chrome-mask-x")).toMatch(/^\d+px$/);
  });
});
