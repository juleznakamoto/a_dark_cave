import { describe, expect, it } from "vitest";
import {
  resolveDeferredStartMenuMount,
  shouldBlockDeferredStartMenuLoad,
  shouldRequestOpenOnInFlightLoad,
} from "./startScreenDeferredMenu";

describe("resolveDeferredStartMenuMount", () => {
  it("applies and opens when the requesting click is still current", () => {
    expect(resolveDeferredStartMenuMount(false, 1, 1, true)).toEqual({
      apply: true,
      open: true,
    });
  });

  it("applies closed on hover prefetch", () => {
    expect(resolveDeferredStartMenuMount(false, 1, 1, false)).toEqual({
      apply: true,
      open: false,
    });
  });

  it("applies closed if Light Fire already started", () => {
    expect(resolveDeferredStartMenuMount(true, 1, 1, true)).toEqual({
      apply: true,
      open: false,
    });
  });

  it("does not mount if a newer click invalidated the request", () => {
    expect(resolveDeferredStartMenuMount(false, 1, 2, true)).toEqual({
      apply: false,
      open: false,
    });
  });
});

describe("shouldRequestOpenOnInFlightLoad", () => {
  it("marks open when the user clicks during a hover prefetch", () => {
    expect(shouldRequestOpenOnInFlightLoad(false, true)).toBe(true);
  });

  it("does not mark open once the real menu is already mounted", () => {
    expect(shouldRequestOpenOnInFlightLoad(true, false)).toBe(false);
  });
});

describe("shouldBlockDeferredStartMenuLoad", () => {
  it("blocks while a load is in flight", () => {
    expect(shouldBlockDeferredStartMenuLoad(false, true)).toBe(true);
  });

  it("blocks once the real menu is mounted", () => {
    expect(shouldBlockDeferredStartMenuLoad(true, false)).toBe(true);
  });

  it("allows a later click after a stale import settles without mounting", () => {
    const stale = resolveDeferredStartMenuMount(false, 1, 2, true);
    expect(stale.apply).toBe(false);
    const loadInFlightAfterSettle = false;
    expect(shouldBlockDeferredStartMenuLoad(false, loadInFlightAfterSettle)).toBe(
      false,
    );
  });
});
