/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useResourceGainBurstNonce } from "./preciousGainBurst";

describe("useResourceGainBurstNonce", () => {
  it("does not burst on the first snapshot", () => {
    const { result } = renderHook(() =>
      useResourceGainBurstNonce([
        { id: "silver", value: 40 },
        { id: "gold", value: 8 },
        { id: "insight", value: 3 },
      ]),
    );
    expect(result.current).toEqual({});
  });

  it("bumps only the resource that increased", () => {
    const { result, rerender } = renderHook(
      ({ rows }) => useResourceGainBurstNonce(rows),
      {
        initialProps: {
          rows: [
            { id: "silver", value: 40 },
            { id: "gold", value: 8 },
          ],
        },
      },
    );

    rerender({
      rows: [
        { id: "silver", value: 55 },
        { id: "gold", value: 8 },
      ],
    });

    expect(result.current.silver).toBe(1);
    expect(result.current.gold).toBeUndefined();
  });

  it("does not bump when the amount falls", () => {
    const { result, rerender } = renderHook(
      ({ rows }) => useResourceGainBurstNonce(rows),
      { initialProps: { rows: [{ id: "insight", value: 12 }] } },
    );

    rerender({ rows: [{ id: "insight", value: 4 }] });
    expect(result.current.insight).toBeUndefined();
  });

  it("bursts when a resource row appears after load", () => {
    const { result, rerender } = renderHook(
      ({ rows }) => useResourceGainBurstNonce(rows),
      { initialProps: { rows: [{ id: "silver", value: 10 }] } },
    );

    rerender({
      rows: [
        { id: "silver", value: 10 },
        { id: "gold", value: 5 },
      ],
    });

    expect(result.current.gold).toBe(1);
    expect(result.current.silver).toBeUndefined();
  });

  it("extends the nonce again on a later increase", () => {
    const { result, rerender } = renderHook(
      ({ rows }) => useResourceGainBurstNonce(rows),
      { initialProps: { rows: [{ id: "insight", value: 1 }] } },
    );

    act(() => {
      rerender({ rows: [{ id: "insight", value: 2 }] });
    });
    act(() => {
      rerender({ rows: [{ id: "insight", value: 4 }] });
    });

    expect(result.current.insight).toBe(2);
  });
});
