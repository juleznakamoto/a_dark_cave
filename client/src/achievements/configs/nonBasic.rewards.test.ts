import { describe, expect, it } from "vitest";
import { computeAchievementRewards } from "../achievementHelpers";
import type { AchievementChartConfig } from "../achievementTypes";
import { actionChartConfig } from "./action";
import { buildingChartConfig } from "./building";
import { itemChartConfig } from "./item";

const SILVER = { silver: 250 };
const INSIGHT = { insight: 750 };
const GOLD = { gold: 100 };

function paidRewards(config: AchievementChartConfig) {
  const out: Record<string, Record<string, number>> = {};
  for (const ring of config.rings) {
    for (const seg of ring) {
      out[`${config.idPrefix}-${seg.segmentId}`] = computeAchievementRewards(
        seg,
        0,
      );
    }
  }
  return out;
}

describe("non-basic achievement rewards", () => {
  it("keeps early claims on silver", () => {
    const paid = {
      ...paidRewards(actionChartConfig),
      ...paidRewards(buildingChartConfig),
    };
    expect(paid["action-0-exploreCave"]).toEqual(SILVER);
    expect(paid["action-0-chopWood"]).toEqual(SILVER);
    expect(paid["action-0-hunt"]).toEqual(SILVER);
    expect(paid["action-0-craftTorches"]).toEqual(SILVER);
    expect(paid["action-1-mineStone"]).toEqual(SILVER);
    expect(paid["action-4-feedFire"]).toEqual(SILVER);
    expect(paid["building-0-0"]).toEqual(SILVER);
  });

  it("pays 750 Insight on mid-game claims", () => {
    const paid = {
      ...paidRewards(actionChartConfig),
      ...paidRewards(buildingChartConfig),
    };
    for (const id of [
      "action-1-mineIron",
      "action-1-mineCoal",
      "action-1-mineSulfur",
      "action-2-boneTotems",
      "action-2-leatherTotems",
      "action-2-animals",
      "action-2-craftBoneTotems",
      "action-2-craftLeatherTotems",
      "action-0-gamblerWins",
      "action-4-mentalClarity",
      "building-0-1",
      "building-0-2",
      "building-0-3",
      "building-1-0",
      "building-1-3",
      "building-3-0",
    ]) {
      expect(paid[id], id).toEqual(INSIGHT);
    }
  });

  it("pays 100 gold on late claims, including every item", () => {
    const paid = {
      ...paidRewards(actionChartConfig),
      ...paidRewards(buildingChartConfig),
      ...paidRewards(itemChartConfig),
    };
    for (const id of [
      "action-1-mineObsidian",
      "action-1-mineAdamant",
      "action-1-mineMoonstone",
      "action-3-emberBombs",
      "action-3-ashfireBombs",
      "action-3-veinfireElixir",
      "action-3-burningVeins",
      "action-4-merchantPurchases",
      "action-4-wellRested",
      "action-4-solsticeGatherings",
      "action-4-investor",
      "action-4-luckyInvestor",
      "action-4-insightful",
      "action-4-pileOfDead",
      "building-1-1",
      "building-1-2",
      "building-2-0",
      "building-3-1",
      "building-3-2",
      "building-3-3",
      "building-4-0",
      "building-4-1",
      "item-0-axes",
      "item-0-pickaxes",
      "item-0-lanterns",
      "item-1-swords",
      "item-1-bows",
      "item-2-explorer_pack",
      "item-2-schematic_weapons",
      "item-3-ancient_books",
      "item-3-fellowship",
      "item-4-blacksteel_tools",
      "item-4-blacksteel_equipment",
    ]) {
      expect(paid[id], id).toEqual(GOLD);
    }
  });

  it("classifies every non-basic claim as silver, insight, or gold", () => {
    const paid = {
      ...paidRewards(actionChartConfig),
      ...paidRewards(buildingChartConfig),
      ...paidRewards(itemChartConfig),
    };
    expect(Object.keys(paid)).toHaveLength(56);
    for (const [id, rewards] of Object.entries(paid)) {
      expect([SILVER, INSIGHT, GOLD], id).toContainEqual(rewards);
    }
  });
});
