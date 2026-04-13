import { vi } from "vitest";

/**
 * Minimal Supabase chain for `verifyPayment` tests: duplicate check
 * (`from().select().eq().maybeSingle()`), main `insert().select().single()`,
 * and bundle component lines (`insert()` only, `{ error }`).
 */
export function createSupabaseMockForStripeVerify(options?: {
  existingPurchaseByIntent?: Record<string, unknown> | null;
  insertSingleData?: Record<string, unknown>;
  insertSingleError?: unknown;
}) {
  const existing = options?.existingPurchaseByIntent ?? null;
  const insertSingleData = options?.insertSingleData ?? {
    id: "purchase123",
    item_id: "gold_250",
    user_id: "user123",
  };
  const insertSingleError = options?.insertSingleError ?? null;

  const insert = vi.fn((payload: Record<string, unknown>) => {
    const isBundleComponent =
      payload.price_paid === 0 && payload.bundle_id != null;
    if (isBundleComponent) {
      return Promise.resolve({ error: null });
    }
    return {
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: { ...insertSingleData, ...payload },
          error: insertSingleError,
        })),
      })),
    };
  });

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: existing })),
        })),
      })),
      insert,
    })),
    insertSpy: insert,
  };
}
