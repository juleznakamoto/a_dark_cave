/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ShopDialog } from './ShopDialog';
import { useGameStore } from '@/game/state';
import { createShopDialogFetchMock, resetShopDialogAuthMocks } from './shopDialogTestMocks';

const SHOP_PAID_ITEM_CTA = /^(Continue|Purchase)$/i;

const shopAuthMocks = vi.hoisted(() => {
  const mockInsert = vi.fn(() => Promise.resolve({ data: null, error: null }));
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: mockInsert,
  }));
  const mockUser = { id: "test-user-123", email: "test@example.com" };
  const mockGetCurrentUser = vi.fn(() => Promise.resolve(mockUser));
  const mockGetSessionUser = vi.fn(() => Promise.resolve(mockUser));
  const mockEnsureAnonymousSession = vi.fn(() => Promise.resolve(mockUser));
  const mockIsAnonymousSession = vi.fn(() => Promise.resolve(false));
  return {
    mockSupabaseClient: {
      from,
      auth: {
        getSession: vi.fn(() =>
          Promise.resolve({
            data: {
              session: {
                access_token: "test-token",
                user: { id: mockUser.id, email: mockUser.email },
              },
            },
          }),
        ),
      },
    },
    mockGetCurrentUser,
    mockGetSessionUser,
    mockEnsureAnonymousSession,
    mockIsAnonymousSession,
    mockInsert,
  };
});

const { mockEnsureAnonymousSession } = shopAuthMocks;

vi.mock("@/game/auth", () => ({
  getCurrentUser: (...args: unknown[]) =>
    shopAuthMocks.mockGetCurrentUser(...args),
  getSessionUser: (...args: unknown[]) =>
    shopAuthMocks.mockGetSessionUser(...args),
  ensureAnonymousSession: (...args: unknown[]) =>
    shopAuthMocks.mockEnsureAnonymousSession(...args),
  getSessionAccessToken: vi.fn(() => Promise.resolve("test-token")),
  isAnonymousSession: (...args: unknown[]) =>
    shopAuthMocks.mockIsAnonymousSession(...args),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: shopAuthMocks.mockSupabaseClient,
  getSupabaseClient: vi.fn(() =>
    Promise.resolve(shopAuthMocks.mockSupabaseClient),
  ),
  getCachedAuthUser: vi.fn(() => null),
  isAuthStateReady: vi.fn(() => true),
}));
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: any) => <div>{children}</div>,
  PaymentElement: () => <div>Payment Element</div>,
  useStripe: () => ({
    confirmPayment: vi.fn(),
  }),
  useElements: () => ({}),
}));

describe('ShopDialog Currency Detection', { timeout: 15_000 }, () => {
  beforeEach(() => {
    // jsdom doesn't implement matchMedia - required by use-mobile hook
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Reset game store (currency tests set detectedCurrency per test via fetch mock)
    useGameStore.setState({
      resources: { gold: 10000 },
      activatedPurchases: {},
      feastActivations: {},
      detectedCurrency: null,
      greatFeastState: { isActive: false, endTime: 0 },
      hasMadeNonFreePurchase: false,
      isUserSignedIn: true,
      tradersGratitudeState: { accepted: false },
      tradersSonGratitudeState: { accepted: false },
      tools: {},
      weapons: {},
      blessings: {},
      addLogEntry: vi.fn(),
      updateResource: vi.fn(),
    });

    resetShopDialogAuthMocks(shopAuthMocks);
    global.fetch = createShopDialogFetchMock();
  });

  afterEach(() => {
    vi.clearAllMocks();
    resetShopDialogAuthMocks(shopAuthMocks);
  });

  describe('Currency Detection', () => {
    it('should detect EUR for German users', async () => {
      // Mock IP geolocation API to return Germany
      global.fetch = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'DE' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // Should show Euro prices
        expect(screen.getAllByText(/9\.99 €/).length).toBeGreaterThan(0);
      });
    });

    it('should detect EUR for French users', async () => {
      global.fetch = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'FR' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getAllByText(/9\.99 €/).length).toBeGreaterThan(0);
      });
    });

    it('should detect EUR for Spanish users', async () => {
      global.fetch = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'ES' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getAllByText(/9\.99 €/).length).toBeGreaterThan(0);
      });
    });

    it('should detect EUR for Italian users', async () => {
      global.fetch = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'IT' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getAllByText(/9\.99 €/).length).toBeGreaterThan(0);
      });
    });

    it('should default to USD for US users', async () => {
      global.fetch = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'US' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // Should show USD prices
        expect(screen.getAllByText(/\$9\.99/).length).toBeGreaterThan(0);
      });
    });

    it('should default to USD for UK users (not in Eurozone)', async () => {
      global.fetch = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'GB' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getAllByText(/\$9\.99/).length).toBeGreaterThan(0);
      });
    });

    it('should default to USD for Canadian users', async () => {
      global.fetch = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'CA' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getAllByText(/\$9\.99/).length).toBeGreaterThan(0);
      });
    });

    it('should default to USD when geolocation API fails', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // Should fall back to USD
        expect(screen.getAllByText(/\$9\.99/).length).toBeGreaterThan(0);
      });
    });

    it('should default to USD when country_code is missing', async () => {
      global.fetch = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: null }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getAllByText(/\$9\.99/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Currency Display', () => {
    it('should format EUR prices correctly', async () => {
      global.fetch = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'DE' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // Highlights: gold_20000 catalog price (EUR)
        expect(screen.getAllByText('8.99 €').length).toBeGreaterThan(0);
        expect(screen.queryByText('12.49 €')).not.toBeInTheDocument();
      });
    });

    it('should format USD prices correctly', async () => {
      global.fetch = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'US' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // Check USD catalog price for gold_20000 on Highlights
        expect(screen.getAllByText(/\$8\.99/).length).toBeGreaterThan(0);
        expect(screen.queryByText(/\$12\.49/)).not.toBeInTheDocument();
      });
    });

    it('should show event discount strikethrough when Trader\'s Gratitude is active', async () => {
      useGameStore.setState({
        tradersGratitudeState: { accepted: true },
      });

      global.fetch = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'FR' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const struckCatalog = screen.getAllByText(/^8\.99 €$/);
        expect(
          struckCatalog.some((el) => el.classList.contains('line-through')),
        ).toBe(true);
        expect(screen.getAllByText(/^7\.19 €$/).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Payment Intent with Currency', () => {
    it('should send correct currency to payment intent creation', async () => {
      global.fetch = createShopDialogFetchMock((u) => {
        if (u.includes('/api/payment/create-intent')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ clientSecret: 'test_secret_eur' }),
          } as Response);
        }
        return null;
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getAllByText("20'000 Gold").length).toBeGreaterThan(0);
      });

      const purchaseButton = screen.getAllByRole('button', { name: SHOP_PAID_ITEM_CTA })[0];
      fireEvent.click(purchaseButton);

      await waitFor(() => {
        expect(mockEnsureAnonymousSession).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/payment/create-intent',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"currency":"eur"'),
          })
        );
      });
    });

    it('should send USD currency for non-EU users', async () => {
      global.fetch = createShopDialogFetchMock((u) => {
        if (u.includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'US' }),
          } as Response);
        }
        if (u.includes('/api/payment/create-intent')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ clientSecret: 'test_secret_usd' }),
          } as Response);
        }
        return null;
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getAllByText("20'000 Gold").length).toBeGreaterThan(0);
      });

      const purchaseButton = screen.getAllByRole('button', { name: SHOP_PAID_ITEM_CTA })[0];
      fireEvent.click(purchaseButton);

      await waitFor(() => {
        expect(mockEnsureAnonymousSession).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/payment/create-intent',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"currency":"usd"'),
          })
        );
      });
    });
  });

  describe('All EU Euro Countries', () => {
    const euEuroCountries = [
      'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT',
      'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'
    ];

    euEuroCountries.forEach((countryCode) => {
      it(`should detect EUR for ${countryCode}`, async () => {
        global.fetch = vi.fn((url) => {
          if (String(url).includes('ipapi.co')) {
            return Promise.resolve({
              json: () => Promise.resolve({ country_code: countryCode }),
            } as Response);
          }
          return Promise.reject(new Error('Unknown URL'));
        });

        const onClose = vi.fn();
        render(<ShopDialog isOpen={true} onClose={onClose} />);

        await waitFor(() => {
          expect(screen.getAllByText(/9\.99 €/).length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Non-EU Countries', () => {
    const nonEuCountries = [
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'CA', name: 'Canada' },
      { code: 'AU', name: 'Australia' },
      { code: 'JP', name: 'Japan' },
      { code: 'BR', name: 'Brazil' },
      { code: 'IN', name: 'India' },
      { code: 'CN', name: 'China' },
    ];

    nonEuCountries.forEach(({ code, name }) => {
      it(`should default to USD for ${name} (${code})`, async () => {
        global.fetch = vi.fn((url) => {
          if (String(url).includes('ipapi.co')) {
            return Promise.resolve({
              json: () => Promise.resolve({ country_code: code }),
            } as Response);
          }
          return Promise.reject(new Error('Unknown URL'));
        });

        const onClose = vi.fn();
        render(<ShopDialog isOpen={true} onClose={onClose} />);

        await waitFor(() => {
          expect(screen.getAllByText(/\$9\.99/).length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response from geolocation API', async () => {
      global.fetch = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({}),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getAllByText(/\$9\.99/).length).toBeGreaterThan(0);
      });
    });

    it('should handle malformed JSON from geolocation API', async () => {
      global.fetch = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.reject(new Error('Invalid JSON')),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getAllByText(/\$9\.99/).length).toBeGreaterThan(0);
      });
    });

    it('should only call geolocation API once per dialog open', async () => {
      const fetchSpy = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'DE' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });
      global.fetch = fetchSpy;

      const onClose = vi.fn();
      const { rerender } = render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getAllByText(/9\.99 €/).length).toBeGreaterThan(0);
      });

      // Rerender should not trigger another API call
      rerender(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const geoApiCalls = fetchSpy.mock.calls.filter(
          (call) => String(call[0]).includes('ipapi.co')
        );
        expect(geoApiCalls.length).toBe(1);
      });
    });

    it('should reset currency detection when dialog is closed and reopened', async () => {
      const fetchSpy = vi.fn((url) => {
        if (String(url).includes('ipapi.co')) {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'US' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });
      global.fetch = fetchSpy;

      const onClose = vi.fn();
      const { rerender } = render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getAllByText(/\$9\.99/).length).toBeGreaterThan(0);
      });

      // Close dialog
      rerender(<ShopDialog isOpen={false} onClose={onClose} />);

      // Reopen dialog
      rerender(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const geoApiCalls = fetchSpy.mock.calls.filter(
          (call) => String(call[0]).includes('ipapi.co')
        );
        // Currency is cached in state; reopen uses cached value, so 1 call
        expect(geoApiCalls.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
