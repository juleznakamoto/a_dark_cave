import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Stripe from "stripe";

vi.mock("stripe", () => {
  const mockPaymentIntents = {
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
  };
  const mockWebhooks = {
    constructEvent: vi.fn(),
  };
  return {
    default: class MockStripe {
      paymentIntents = mockPaymentIntents;
      webhooks = mockWebhooks;
    },
  };
});

import { handleStripePaymentWebhook } from "./stripeWebhook";
import { createSupabaseMockForStripeVerify } from "./stripeVerifyTestSupabase";

const getMockWebhooks = () => {
  const mockStripe = new Stripe("", { apiVersion: "2024-12-18.acacia" });
  return mockStripe.webhooks;
};

function latestChargeForVerify(): Stripe.Charge {
  return {
    billing_details: { address: { country: null } },
  } as Stripe.Charge;
}

describe("handleStripePaymentWebhook", () => {
  const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_DEV;

  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET_DEV = "whsec_test";
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalWebhookSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET_DEV;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET_DEV = originalWebhookSecret;
    }
  });

  it("returns 400 when stripe-signature is missing", async () => {
    const result = await handleStripePaymentWebhook(
      Buffer.from("{}"),
      undefined,
      createSupabaseMockForStripeVerify(),
    );

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: "Missing stripe-signature header" });
  });

  it("fulfills purchase on payment_intent.succeeded", async () => {
    const mockWebhooks = getMockWebhooks();
    mockWebhooks.constructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_webhook",
          amount: 239,
          status: "succeeded",
          currency: "usd",
          metadata: {
            userId: "user123",
            itemId: "skull_lantern",
          },
        },
      },
    });

    const mockPaymentIntents = new Stripe("", {
      apiVersion: "2024-12-18.acacia",
    }).paymentIntents;
    mockPaymentIntents.retrieve.mockResolvedValue({
      id: "pi_webhook",
      amount: 299,
      status: "succeeded",
      currency: "usd",
      metadata: {
        userId: "user123",
        itemId: "skull_lantern",
      },
      latest_charge: latestChargeForVerify(),
    } as Stripe.PaymentIntent);

    const supabase = createSupabaseMockForStripeVerify({
      insertSingleData: {
        id: "purchase_webhook",
        item_id: "skull_lantern",
        user_id: "user123",
      },
    });

    const result = await handleStripePaymentWebhook(
      Buffer.from('{"type":"payment_intent.succeeded"}'),
      "sig_test",
      supabase,
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ received: true, processed: true });
    expect(mockPaymentIntents.retrieve).toHaveBeenCalledWith("pi_webhook", {
      expand: ["latest_charge"],
    });
  });

  it("acks unhandled event types without fulfilling", async () => {
    const mockWebhooks = getMockWebhooks();
    mockWebhooks.constructEvent.mockReturnValue({
      type: "payment_intent.created",
      data: { object: { id: "pi_new" } },
    });

    const result = await handleStripePaymentWebhook(
      Buffer.from("{}"),
      "sig_test",
      createSupabaseMockForStripeVerify(),
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ received: true, processed: false });
  });

  it("returns 500 when verifyPayment throws so Stripe retries", async () => {
    const mockWebhooks = getMockWebhooks();
    mockWebhooks.constructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_fail",
          metadata: { userId: "user123", itemId: "skull_lantern" },
        },
      },
    });

    const mockPaymentIntents = new Stripe("", {
      apiVersion: "2024-12-18.acacia",
    }).paymentIntents;
    mockPaymentIntents.retrieve.mockRejectedValue(new Error("Stripe down"));

    const result = await handleStripePaymentWebhook(
      Buffer.from("{}"),
      "sig_test",
      createSupabaseMockForStripeVerify(),
    );

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ error: "Failed to fulfill payment" });
  });
});
