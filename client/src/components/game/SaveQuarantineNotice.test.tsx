/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { SAVE_QUARANTINE_NOTICE_KEY } from "@/game/save";
import SaveQuarantineNotice from "./SaveQuarantineNotice";

describe("SaveQuarantineNotice", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("stays hidden when no save was quarantined", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <SaveQuarantineNotice />
      </I18nextProvider>,
    );
    expect(screen.queryByTestId("save-quarantine-notice")).toBeNull();
  });

  it("explains the kept save once, then dismisses", async () => {
    sessionStorage.setItem(SAVE_QUARANTINE_NOTICE_KEY, "1");
    render(
      <I18nextProvider i18n={i18n}>
        <SaveQuarantineNotice />
      </I18nextProvider>,
    );
    expect(screen.getByTestId("save-quarantine-notice").textContent).toContain(
      "new game",
    );
    expect(sessionStorage.getItem(SAVE_QUARANTINE_NOTICE_KEY)).toBe("1");

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByTestId("save-quarantine-notice")).toBeNull();
    expect(sessionStorage.getItem(SAVE_QUARANTINE_NOTICE_KEY)).toBeNull();
  });
});
