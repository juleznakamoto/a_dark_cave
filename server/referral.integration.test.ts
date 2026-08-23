import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import { processReferral } from "./referral";
import { getOrCreateReferralCode } from "./referralCodes";

vi.mock("./referralCodes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./referralCodes")>();
  return {
    ...actual,
    getOrCreateReferralCode: vi.fn(),
  };
});

vi.mock("./referral", () => ({
  processReferral: vi.fn(),
}));

describe("Referral API Integration", { timeout: 15_000 }, () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    app.get("/api/referral/code", async (_req, res) => {
      const code = await getOrCreateReferralCode({} as never, "user-1");
      res.json({ referralCode: code });
    });

    app.post("/api/referral/process", async (req, res) => {
      if (!req.headers.authorization?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authorization required" });
      }
      const referralCode =
        typeof req.body?.referralCode === "string" ? req.body.referralCode : null;
      const result = await processReferral("session-user", referralCode);
      res.setHeader("Content-Type", "application/json");
      res.json(result);
    });
  });

  it("rejects unauthenticated claims", async () => {
    const response = await request(app).post("/api/referral/process").send({
      referralCode: "AB3K9M",
    });

    expect(response.status).toBe(401);
  });

  it("accepts an authenticated sync without a code", async () => {
    vi.mocked(processReferral).mockResolvedValue({ success: true });
    const response = await request(app)
      .post("/api/referral/process")
      .set("Authorization", "Bearer tok")
      .send({});

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(processReferral).toHaveBeenCalledWith("session-user", null);
  });

  it("should return referral code JSON", async () => {
    vi.mocked(getOrCreateReferralCode).mockResolvedValue("AB3K9M");
    const response = await request(app).get("/api/referral/code");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ referralCode: "AB3K9M" });
  });
});
