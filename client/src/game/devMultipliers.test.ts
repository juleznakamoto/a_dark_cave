import { describe, expect, it, vi } from "vitest";
import { fetchAccountPrivileges, resolveDevMode } from "./devMultipliers";

describe("dev multipliers", () => {
  it("enables DEV mode for allowlisted live accounts", () => {
    expect(resolveDevMode(true)).toBe(true);
  });

  it("reads the account privilege endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true, steamMode: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAccountPrivileges("token")).resolves.toEqual({
      enabled: true,
      steamMode: true,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/account/dev-multipliers", {
      headers: { Authorization: "Bearer token" },
    });

    vi.unstubAllGlobals();
  });

  it("treats a failed privilege request as disabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );
    await expect(fetchAccountPrivileges("token")).resolves.toEqual({
      enabled: false,
      steamMode: false,
    });
    vi.unstubAllGlobals();
  });
});
