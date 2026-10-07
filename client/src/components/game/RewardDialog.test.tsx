/**
 * @vitest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/game/headerIndicatorIcons", () => ({
  outcomeDialogIcon: () => ({
    uiIcon: "reward",
    uiIconSizeClassName: "h-7 w-7",
    uiIconClassName: "",
    ringClassName: "border-amber-500/45",
  }),
}));

import RewardDialog from "./RewardDialog";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";

describe("RewardDialog button", () => {
  beforeEach(async () => {
    await ensureGameplayLocalesLoaded();
  });

  it("keeps Claim Rewards when the outcome is only gains", () => {
    render(
      <RewardDialog
        isOpen
        onClose={vi.fn()}
        data={{
          title: "Found supplies",
          rewards: { resources: { wood: 10 } },
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Claim Rewards" })).toBeTruthy();
  });

  it("says Continue when the outcome is only a loss", () => {
    render(
      <RewardDialog
        isOpen
        onClose={vi.fn()}
        data={{
          title: "A grim night",
          rewards: { villagersLost: 1 },
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Claim Rewards" })).toBeNull();
  });

  it("says Continue when gains and losses are shown together", () => {
    render(
      <RewardDialog
        isOpen
        onClose={vi.fn()}
        data={{
          title: "A hard bargain",
          rewards: {
            resources: { wood: 10 },
            villagersLost: 1,
          },
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
  });
});
