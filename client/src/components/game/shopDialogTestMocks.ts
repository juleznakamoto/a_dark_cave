import { vi } from "vitest";

export const SHOP_TEST_USER = {
  id: "test-user-123",
  email: "test@example.com",
};

/** Fetch mock body with both `json()` and `text()` (shop reads `response.text()`). */
export function shopFetchJsonResponse(
  data: unknown,
  init?: { ok?: boolean; status?: number },
): Response {
  const raw = JSON.stringify(data);
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(raw),
  } as Response;
}

/** Default fetch: ipapi (EUR) + payment create-intent. */
export function createShopDialogFetchMock(
  overrides?: (url: string | URL) => Response | Promise<Response> | null,
) {
  return vi.fn((url: string | URL) => {
    const u = String(url);
    if (overrides) {
      const custom = overrides(u);
      if (custom !== null) return custom;
    }
    if (u.includes("ipapi.co")) {
      return Promise.resolve(shopFetchJsonResponse({ country_code: "DE" }));
    }
    if (u.includes("/api/payment/create-intent")) {
      return Promise.resolve(
        shopFetchJsonResponse({ clientSecret: "test_secret" }),
      );
    }
    return Promise.reject(new Error(`Unknown URL: ${url}`));
  });
}

export function createShopAuthMocks() {
  const mockInsert = vi.fn(() => Promise.resolve({ data: null, error: null }));
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: mockInsert,
  }));
  const mockGetCurrentUser = vi.fn(() => Promise.resolve(SHOP_TEST_USER));
  const mockGetSessionUser = vi.fn(() => Promise.resolve(SHOP_TEST_USER));
  const mockEnsureAnonymousSession = vi.fn(() => Promise.resolve(SHOP_TEST_USER));
  const mockIsAnonymousSession = vi.fn(() => Promise.resolve(false));
  const mockSupabaseClient = {
    from,
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: {
            session: {
              access_token: "test-token",
              user: { id: SHOP_TEST_USER.id, email: SHOP_TEST_USER.email },
            },
          },
        }),
      ),
    },
  };

  return {
    mockSupabaseClient,
    mockGetCurrentUser,
    mockGetSessionUser,
    mockEnsureAnonymousSession,
    mockIsAnonymousSession,
    mockInsert,
  };
}

export function resetShopDialogAuthMocks(mocks: ReturnType<typeof createShopAuthMocks>) {
  mocks.mockGetCurrentUser.mockResolvedValue(SHOP_TEST_USER);
  mocks.mockGetSessionUser.mockResolvedValue(SHOP_TEST_USER);
  mocks.mockEnsureAnonymousSession.mockResolvedValue(SHOP_TEST_USER);
  mocks.mockIsAnonymousSession.mockResolvedValue(false);
}
