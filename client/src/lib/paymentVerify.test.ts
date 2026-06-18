import { describe, it, expect, vi, afterEach } from "vitest";
import { verifyPaymentWithRetry } from "./paymentVerify";

vi.mock("@/game/auth", () => ({
  getSessionAccessToken: vi.fn().mockResolvedValue("token"),
}));

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("verifyPaymentWithRetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not retry on 4xx client errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(401, { error: "Authorization required" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyPaymentWithRetry("pi_test", "user-1", 3);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ error: "Authorization required" });
  });

  it("retries on 5xx then returns success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: "Unavailable" }))
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, itemId: "gold_250" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyPaymentWithRetry("pi_test", "user-1", 3);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true, itemId: "gold_250" });
  });
});
