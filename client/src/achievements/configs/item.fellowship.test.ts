import { describe, expect, it } from "vitest";
import { FELLOWSHIP_MEMBER_ORDER } from "@shared/schema";
import { itemChartConfig } from "./item";

describe("item Good Company", () => {
  it("requires every fellowship member, including the One-eyed Crow", () => {
    const seg = itemChartConfig.rings
      .flat()
      .find((s) => s.segmentId === "3-fellowship");

    expect(seg?.maxCount).toBe(FELLOWSHIP_MEMBER_ORDER.length);
    expect(FELLOWSHIP_MEMBER_ORDER).toContain("one_eyed_crow");
    expect(FELLOWSHIP_MEMBER_ORDER).toHaveLength(6);
  });
});
