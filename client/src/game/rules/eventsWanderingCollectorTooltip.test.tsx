/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import i18n from "@/i18n";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { composeCollectorItemTooltip } from "./eventsWanderingCollectorTooltip";

describe("composeCollectorItemTooltip", () => {
  it("shows the item tooltip for buy and sell choices, without the gold price", async () => {
    await ensureGameplayLocalesLoaded();
    await i18n.changeLanguage("en");

    const buy = composeCollectorItemTooltip("buy_bone_dice");
    render(<>{buy}</>);
    expect(screen.getByText("Luck: +5")).toBeInTheDocument();
    expect(
      screen.getByText(/Dice carved from bones, polished to a soft/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Gold/)).not.toBeInTheDocument();

    const sell = composeCollectorItemTooltip("sell_manhunter_bow");
    render(<>{sell}</>);
    expect(screen.getByText("Strength: +4")).toBeInTheDocument();
    expect(
      screen.getByText("Bow of the manhunter, strung for hunting people."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Gold/)).not.toBeInTheDocument();
  });

  it("returns null for leave and unknown choices", () => {
    expect(composeCollectorItemTooltip("sell_nothing")).toBeNull();
    expect(composeCollectorItemTooltip("buy_not_a_relic")).toBeNull();
  });
});
