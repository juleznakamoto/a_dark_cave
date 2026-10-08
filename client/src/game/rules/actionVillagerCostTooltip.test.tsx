/** @vitest-environment jsdom */
import React from "react";
import { beforeAll, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { gameStateSchema } from "@shared/schema";
import { ensureGameplayLocalesLoaded } from "@/i18n/loadLocaleResources";
import { getActionCostBreakdown } from "./index";
import {
  ActionTooltipResourceRows,
  getResourceGainTooltip,
} from "./tooltips";

describe("action villager cost tooltip", () => {
  beforeAll(async () => {
    await ensureGameplayLocalesLoaded();
  });

  it("places expedition villager cost after the time cost in the resource section", () => {
    const state = gameStateSchema.parse({
      tools: { iron_lantern: true },
      resources: { food: 50 },
      villagers: { free: 2 },
    });
    const node = getResourceGainTooltip("descendFurther", state);
    const { container } = render(<>{node}</>);
    const text = container.textContent ?? "";

    const foodAt = text.indexOf("-50 Food");
    const timeAt = text.indexOf("20s");
    const villagerAt = text.indexOf("2 Free Villagers");
    expect(text).not.toContain("-2 Free Villagers");
    const rewardAt = text.indexOf("Stone");

    expect(foodAt).toBeGreaterThanOrEqual(0);
    expect(timeAt).toBeGreaterThan(foodAt);
    expect(villagerAt).toBeGreaterThan(timeAt);
    expect(rewardAt).toBeGreaterThan(villagerAt);
    expect(text.indexOf("Requires")).toBe(-1);
    expect(container.querySelector(".text-muted-foreground")).toBeNull();
  });

  it("mutes the villager cost when there are not enough free villagers", () => {
    const state = gameStateSchema.parse({
      tools: { iron_lantern: true },
      resources: { food: 50 },
      villagers: { free: 0 },
    });
    const node = getResourceGainTooltip("descendFurther", state);
    const { container } = render(<>{node}</>);
    const muted = container.querySelector(".text-muted-foreground");
    expect(muted?.textContent?.includes("-")).toBe(false);
    expect(muted?.textContent).toContain("2 Free Villagers");
  });

  it("places the humans sacrifice villager cost after the time cost", () => {
    const state = gameStateSchema.parse({
      flags: { humanSacrificeUnlocked: true },
      buildings: { blackMonolith: 1 },
      story: { seen: { humansSacrificeLevel: 0 } },
      villagers: { free: 10, total: 10 },
    });
    const costs = getActionCostBreakdown("humans", state);
    const { container } = render(
      <ActionTooltipResourceRows actionId="humans" state={state} costs={costs} />,
    );
    const text = container.textContent ?? "";
    const timeAt = text.indexOf("1m 30s");
    const villagerAt = text.indexOf("1 Villager");
    expect(text).not.toContain("-1 Villager");
    expect(timeAt).toBeGreaterThanOrEqual(0);
    expect(villagerAt).toBeGreaterThan(timeAt);
  });
});
