import { describe, expect, it, vi } from "vitest";
import { fetchAccountDevMultipliersEnabled, resolveDevMode } from "./devMultipliers";

describe("dev multipliers", () => {
  it("enables DEV mode for allowlisted live accounts", () => {
    expect(resolveDevMode(true)).toBe(true);
  });

  it("reads the account privilege endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ enabled: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchAccountDevMultipliersEnabled("token")).resolves.toBe(true);
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
    await expect(fetchAccountDevMultipliersEnabled("token")).resolves.toBe(false);
    vi.unstubAllGlobals();
  });
});
