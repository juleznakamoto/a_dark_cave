import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStartupSaveHeaderKey } from "./saveKeys";
import {
  peekStartupGameStarted,
  setPreferStartScreen,
  shouldBootGameSurface,
} from "./startupBootSurface";

describe("shouldBootGameSurface", () => {
  const storage = new Map<string, string>();
  const session = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    session.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => session.get(key) ?? null,
      setItem: (key: string, value: string) => session.set(key, value),
      removeItem: (key: string) => {
        session.delete(key);
      },
    });
  });

  it("stays on the start screen for a new visitor", () => {
    expect(
      shouldBootGameSurface({ pathname: "/", search: "", hash: "" }),
    ).toBe(false);
    expect(peekStartupGameStarted()).toBe(false);
  });

  it("boots Game when the save header says the run started", () => {
    storage.set(
      getStartupSaveHeaderKey(),
      JSON.stringify({ version: 1, gameStarted: true }),
    );
    expect(
      shouldBootGameSurface({ pathname: "/", search: "", hash: "" }),
    ).toBe(true);
  });

  it("ignores an unstarted or invalid header", () => {
    storage.set(
      getStartupSaveHeaderKey(),
      JSON.stringify({ version: 1, gameStarted: false }),
    );
    expect(
      shouldBootGameSurface({ pathname: "/", search: "", hash: "" }),
    ).toBe(false);

    storage.set(getStartupSaveHeaderKey(), "not-json");
    expect(peekStartupGameStarted()).toBe(false);
  });

  it("stays on the start screen when a title click prefers it", () => {
    storage.set(
      getStartupSaveHeaderKey(),
      JSON.stringify({ version: 1, gameStarted: true }),
    );
    setPreferStartScreen();
    expect(
      shouldBootGameSurface({ pathname: "/", search: "", hash: "" }),
    ).toBe(false);
  });

  it("still boots Game for forceGame even when start is preferred", () => {
    setPreferStartScreen();
    expect(
      shouldBootGameSurface({
        pathname: "/",
        search: "?email_confirmed=true",
        hash: "",
      }),
    ).toBe(true);
  });

  it("boots Game for forceGame callback intent without a header", () => {
    expect(
      shouldBootGameSurface({
        pathname: "/",
        search: "?email_confirmed=true",
        hash: "",
      }),
    ).toBe(true);
    expect(
      shouldBootGameSurface({ pathname: "/boost", search: "", hash: "" }),
    ).toBe(true);
  });
});
