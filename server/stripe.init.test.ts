import { afterEach, describe, expect, it, vi } from "vitest";

describe("stripe module without a secret key", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("stripe");
  });

  it("loads without constructing Stripe when the secret key is missing", async () => {
    vi.resetModules();
    delete process.env.STRIPE_SECRET_KEY_DEV;
    delete process.env.STRIPE_SECRET_KEY_PROD;

    const stripeCtor = vi.fn(() => {
      throw new Error("Neither apiKey nor config.authenticator provided");
    });
    vi.doMock("stripe", () => ({ default: stripeCtor }));

    await import("./stripe");

    expect(stripeCtor).not.toHaveBeenCalled();
  });
});
