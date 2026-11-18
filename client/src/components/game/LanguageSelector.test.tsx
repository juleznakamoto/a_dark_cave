/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import LanguageSelector from "./LanguageSelector";

vi.mock("@/i18n/useLocale", () => ({
  useLocale: () => ({
    locale: "en",
    setLocale: vi.fn(),
    locales: ["en", "de"],
    localeLabels: { en: "English", de: "Deutsch" },
  }),
}));

vi.mock("@/i18n/useUiTranslation", () => ({
  useUiTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("LanguageSelector start-screen defaultOpen", () => {
  it("opens on mount when defaultOpen is true (deferred click-to-load)", () => {
    render(
      <LanguageSelector
        showTooltip={false}
        defaultOpen
        iconVariant="globe"
      />,
    );

    expect(
      screen.getByRole("button", { name: "languageSelector.ariaLabel" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "English" })).toBeInTheDocument();
  });

  it("stays open through leftover outside pointer events from the loading tap", () => {
    vi.useFakeTimers();
    try {
      render(
        <LanguageSelector
          showTooltip={false}
          defaultOpen
          unstyledTrigger
          iconVariant="globe"
        />,
      );

      expect(screen.getByRole("menu")).toBeInTheDocument();

      act(() => {
        fireEvent.pointerDown(document.body);
        fireEvent.pointerUp(document.body);
        fireEvent.click(document.body);
      });

      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "languageSelector.ariaLabel" }),
      ).toHaveAttribute("aria-expanded", "true");
    } finally {
      vi.useRealTimers();
    }
  });
});
