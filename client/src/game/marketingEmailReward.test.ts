import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

vi.mock("@/game/auth", () => ({
  getCurrentUser: vi.fn(),
  getSessionAccessToken: vi.fn(),
}));

import { getCurrentUser, getSessionAccessToken } from "@/game/auth";
import {
  fetchMarketingOptInPreference,
  getConfirmedUserAccessToken,
} from "./marketingEmailReward";

describe("fetchMarketingOptInPreference", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("returns null without a confirmed user and does not call the API", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    await expect(fetchMarketingOptInPreference()).resolves.toBe(null);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns opt-in state for confirmed users", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "player@example.com",
    });
    vi.mocked(getSessionAccessToken).mockResolvedValue("jwt-test");
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ marketing_opt_in: true }), { status: 200 }),
    );

    await expect(fetchMarketingOptInPreference()).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("getConfirmedUserAccessToken", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the resolved session token string, not a Promise", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "player@example.com",
    });
    vi.mocked(getSessionAccessToken).mockResolvedValue("jwt-test");

    const token = await getConfirmedUserAccessToken();

    expect(token).toBe("jwt-test");
    expect(typeof token).toBe("string");
  });
});
