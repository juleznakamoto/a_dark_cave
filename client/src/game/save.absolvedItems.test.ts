import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import {
  mergeAbsolvedItemsFromSaves,
  unionTrueRecord,
} from "./save";

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    gameId: "run-1",
    playTime: 1000,
    absolvedItems: {},
    ...overrides,
  } as GameState;
}

describe("unionTrueRecord", () => {
  it("keeps true keys from every map", () => {
    expect(
      unionTrueRecord(
        { unnamed_book: true, elder_scroll: false },
        { cracked_crown: true, unnamed_book: false },
        null,
      ),
    ).toEqual({ unnamed_book: true, cracked_crown: true });
  });
});

describe("mergeAbsolvedItemsFromSaves", () => {
  it("restores rites from the non-preferred copy of the same run", () => {
    const preferred = baseState({
      resources: { insight: 0 } as GameState["resources"],
      absolvedItems: {},
    });
    const other = baseState({
      absolvedItems: { unnamed_book: true, elder_scroll: true },
    });

    const merged = mergeAbsolvedItemsFromSaves(preferred, other);
    expect(merged.absolvedItems).toEqual({
      unnamed_book: true,
      elder_scroll: true,
    });
    expect(merged.resources.insight).toBe(0);
  });

  it("unions rites when both copies have some", () => {
    const preferred = baseState({
      absolvedItems: { unnamed_book: true },
    });
    const other = baseState({
      absolvedItems: { elder_scroll: true },
    });

    expect(mergeAbsolvedItemsFromSaves(preferred, other).absolvedItems).toEqual({
      unnamed_book: true,
      elder_scroll: true,
    });
  });

  it("does not merge a different playthrough", () => {
    const preferred = baseState({
      gameId: "new-run",
      absolvedItems: {},
    });
    const other = baseState({
      gameId: "old-run",
      absolvedItems: { unnamed_book: true },
    });

    expect(mergeAbsolvedItemsFromSaves(preferred, other).absolvedItems).toEqual(
      {},
    );
  });

  it("does not merge during a restart overwrite", () => {
    const preferred = baseState({
      allowPlayTimeOverwrite: true,
      absolvedItems: {},
    });
    const other = baseState({
      absolvedItems: { unnamed_book: true },
    });

    expect(mergeAbsolvedItemsFromSaves(preferred, other).absolvedItems).toEqual(
      {},
    );
  });
});
