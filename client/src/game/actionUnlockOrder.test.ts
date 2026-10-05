import { describe, expect, it } from "vitest";
import {
  BUILD_ACTION_APPEND_LAST_IDS,
  mergeUnlockOrder,
  orderByUnlock,
  orderCraftOnceRow,
  sanitizeActionUnlockOrder,
} from "./actionUnlockOrder";

const buildCatalog = [
  { id: "buildHeartfire" },
  { id: "buildWoodenHut" },
  { id: "buildBuildersLodge" },
  { id: "buildCabin" },
];

describe("mergeUnlockOrder", () => {
  it("appends a newly unlocked building after ones the player already has", () => {
    const next = mergeUnlockOrder(
      ["buildWoodenHut", "buildCabin"],
      ["buildHeartfire", "buildWoodenHut", "buildBuildersLodge", "buildCabin"],
      { appendLastIds: BUILD_ACTION_APPEND_LAST_IDS },
    );
    expect(next).toEqual([
      "buildWoodenHut",
      "buildCabin",
      "buildBuildersLodge",
      "buildHeartfire",
    ]);
  });

  it("puts heartfire at the bottom of a list that is recorded for the first time", () => {
    const next = mergeUnlockOrder(
      [],
      buildCatalog.map((action) => action.id),
      { appendLastIds: BUILD_ACTION_APPEND_LAST_IDS },
    );
    expect(next).toEqual([
      "buildWoodenHut",
      "buildBuildersLodge",
      "buildCabin",
      "buildHeartfire",
    ]);
  });

  it("does not move a button that was already recorded", () => {
    const remembered = ["buildHeartfire", "buildWoodenHut"];
    expect(
      mergeUnlockOrder(remembered, ["buildHeartfire", "buildWoodenHut"], {
        appendLastIds: BUILD_ACTION_APPEND_LAST_IDS,
      }),
    ).toBe(remembered);
  });

  it("keeps catalog order when several buttons appear together", () => {
    expect(mergeUnlockOrder(["chopWood"], ["chopWood", "hunt", "layTrap"])).toEqual([
      "chopWood",
      "hunt",
      "layTrap",
    ]);
  });

  it("drops duplicate and non-string ids when reading a save", () => {
    expect(
      sanitizeActionUnlockOrder(["buildWoodenHut", 4, "", "buildWoodenHut", "buildCabin"]),
    ).toEqual(["buildWoodenHut", "buildCabin"]);
    expect(sanitizeActionUnlockOrder(null)).toEqual([]);
  });
});

describe("orderCraftOnceRow", () => {
  const isOnce = (id: string) => id !== "craftTorches" && id !== "craftBoneTotems";

  it("leaves a repeatable row in catalog order", () => {
    const row = [{ id: "craftTorches" }, { id: "craftBoneTotems" }];
    expect(
      orderCraftOnceRow(row, isOnce, () => {
        throw new Error("repeatable crafts are not reordered");
      }),
    ).toBe(row);
  });

  it("appends a newly unlocked one-time craft after repeatable crafts", () => {
    const ordered = orderCraftOnceRow(
      [
        { id: "craftTorches" },
        { id: "craftBoneTotems" },
        { id: "craftSteelLantern" },
        { id: "craftIronLantern" },
      ],
      isOnce,
      (once) =>
        orderByUnlock(
          once,
          ["craftIronLantern"],
          (action) => action.id,
        ),
    );
    expect(ordered.map((action) => action.id)).toEqual([
      "craftTorches",
      "craftBoneTotems",
      "craftIronLantern",
      "craftSteelLantern",
    ]);
  });
});

describe("orderByUnlock", () => {
  it("hides recorded buttons that are not on screen without forgetting them", () => {
    const ordered = orderByUnlock(
      [{ id: "buildWoodenHut" }, { id: "buildCabin" }],
      ["buildHeartfire", "buildWoodenHut", "buildCabin"],
      (action) => action.id,
    );
    expect(ordered.map((action) => action.id)).toEqual([
      "buildWoodenHut",
      "buildCabin",
    ]);
  });
});
