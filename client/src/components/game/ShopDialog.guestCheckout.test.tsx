/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShopDialog } from './ShopDialog';
import { useGameStore } from '@/game/state';
import { shopFetchJsonResponse } from './shopDialogTestMocks';
import i18n from '@/i18n';
import { ensureGameplayLocalesLoaded } from '@/i18n/loadLocaleResources';

const SHOP_PAID_ITEM_CTA = /^(Continue|Purchase)$/i;

const {
  mockSupabaseClient,
  mockEnsureAnonymousSession,
  mockIsAnonymousSession,
  mockUser,
} = vi.hoisted(() => {
  const mockUser = { id: 'anon-guest-1', email: '' };
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
  }));
  return {
    mockSupabaseClient: {
      from,
      auth: {
        getSession: vi.fn(() =>
          Promise.resolve({
            data: {
              session: {
                access_token: 'test-jwt',
                user: { id: 'anon-guest-1', is_anonymous: true },
              },
            },
          }),
        ),
      },
    },
    mockEnsureAnonymousSession: vi.fn(() => Promise.resolve(mockUser)),
    mockIsAnonymousSession: vi.fn(() => Promise.resolve(true)),
    mockUser,
  };
});

vi.mock('@/game/auth', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve(null)),
  getSessionUser: vi.fn(() => Promise.resolve(mockUser)),
  ensureAnonymousSession: (...args: unknown[]) =>
    mockEnsureAnonymousSession(...args),
  getSessionAccessToken: vi.fn(() => Promise.resolve('test-jwt')),
  isAnonymousSession: (...args: unknown[]) => mockIsAnonymousSession(...args),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
  getSupabaseClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
  getCachedAuthUser: vi.fn(() => null),
  isAuthStateReady: vi.fn(() => true),
}));

vi.mock('@/game/save', () => ({
  saveGame: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/game/stateHelpers', () => ({
  buildGameState: vi.fn((s) => s),
}));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({})),
}));

const mockConfirmPayment = vi.fn();

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PaymentElement: () => <div>Payment Element</div>,
  useStripe: () => ({
    confirmPayment: mockConfirmPayment,
  }),
  useElements: () => ({}),
}));

describe('ShopDialog guest checkout', () => {
  beforeAll(async () => {
    await ensureGameplayLocalesLoaded();
    await i18n.changeLanguage('en');
  });

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
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

    useGameStore.setState({
      isUserSignedIn: false,
      detectedCurrency: 'USD',
      hasMadeNonFreePurchase: false,
      feastActivations: {},
      activatedPurchases: {},
      resources: { gold: 0 },
      addLogEntry: vi.fn(),
      updateResource: vi.fn(),
      setAuthDialogOpen: vi.fn(),
    });

    mockConfirmPayment.mockResolvedValue({
      error: null,
      paymentIntent: { id: 'pi_test', status: 'succeeded' },
    });

    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.includes('ipapi.co')) {
        return Promise.resolve(shopFetchJsonResponse({ country_code: 'US' }));
      }
      if (u.includes('/api/payment/create-intent')) {
        return Promise.resolve(shopFetchJsonResponse({ clientSecret: 'cs_test' }));
      }
      if (u.includes('/api/payment/verify')) {
        return Promise.resolve(
          shopFetchJsonResponse({ success: true, itemId: 'great_feast_1' }),
        );
      }
      return Promise.reject(new Error(`Unknown URL: ${url}`));
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('allows paid purchase without confirmed account', async () => {
    const user = userEvent.setup();
    render(<ShopDialog isOpen onClose={vi.fn()} onOpen={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: SHOP_PAID_ITEM_CTA }).length).toBeGreaterThan(0);
    });

    const paidButton = screen.getAllByRole('button', { name: SHOP_PAID_ITEM_CTA })[0];
    expect(paidButton).not.toBeDisabled();

    await user.click(paidButton);

    await waitFor(() => {
      expect(mockEnsureAnonymousSession).toHaveBeenCalled();
    });
  });

  it('passes anonymous userId to create-intent', async () => {
    const user = userEvent.setup();
    render(<ShopDialog isOpen onClose={vi.fn()} onOpen={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: SHOP_PAID_ITEM_CTA }).length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByRole('button', { name: SHOP_PAID_ITEM_CTA })[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/payment/create-intent',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"userId":"anon-guest-1"'),
        }),
      );
    });
  });
});
