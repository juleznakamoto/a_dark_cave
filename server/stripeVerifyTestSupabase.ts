import { vi } from "vitest";

export type StripeVerifySupabaseMockOptions = {
  existingPurchaseByIntent?: Record<string, unknown> | null;
  userPurchaseRows?: Array<{ item_id: string }>;
  gameState?: Record<string, unknown> | null;
  insertSingleData?: Record<string, unknown>;
  insertSingleError?: unknown;
};

/**
 * Supabase chain for `verifyPayment` tests: duplicate PI check, owned-item check,
 * discount game-state read, purchase insert, and optional discount persistence update.
 */
export function createSupabaseMockForStripeVerify(
  options?: StripeVerifySupabaseMockOptions,
) {
  const existing = options?.existingPurchaseByIntent ?? null;
  const userPurchaseRows = options?.userPurchaseRows ?? [];
  const gameState = options?.gameState ?? null;
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

  const update = vi.fn(() => ({
    eq: vi.fn(async () => ({ error: null })),
  }));

  const from = vi.fn((table: string) => {
    if (table === "purchases") {
      return {
        select: vi.fn((cols?: string) => {
          if (cols === "item_id") {
            return {
              eq: vi.fn(async () => ({
                data: userPurchaseRows,
                error: null,
              })),
            };
          }
          return {
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: existing })),
            })),
          };
        }),
        insert,
      };
    }

    if (table === "game_saves") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: gameState ? { game_state: gameState } : null,
              error: null,
            })),
          })),
        })),
        update,
      };
    }

    throw new Error(`Unexpected table in mock: ${table}`);
  });

  return {
    from,
    insertSpy: insert,
    updateSpy: update,
  };
}
