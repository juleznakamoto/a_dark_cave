/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { Button } from "./button";

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
