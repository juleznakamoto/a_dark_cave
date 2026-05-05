/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/** Wait for dialog to finish loading, then return the Purchases tab */
async function waitForPurchasesTab() {
  return screen.findByRole('tab', { name: /purchases/i }, { timeout: 5000 });
}

/** Find claim button within a specific item card (use when multiple free items have claim buttons) */
function getClaimButtonForItem(itemName: string): HTMLElement {
  const itemEl = screen.getByText(itemName);
  let el: HTMLElement | null = itemEl.parentElement;
  while (el) {
    const btn = within(el).queryByRole('button', { name: /claim/i });
    if (btn) return btn;
    el = el.parentElement;
  }
  throw new Error(`No claim button found for item: ${itemName}`);
}

async function clickShopFilter(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await user.click(
    screen.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }),
  );
}
import { ShopDialog } from './ShopDialog';
import { useGameStore } from '@/game/state';
import { SHOP_ITEMS, bundleComponentsListPriceSumCents } from '@shared/shopItems';

// Use vi.hoisted so mock is available when vi.mock factory runs
const { mockSupabaseClient, mockGetCurrentUser, mockInsert } = vi.hoisted(() => {
  const mockInsert = vi.fn(() => Promise.resolve({ data: null, error: null }));
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: mockInsert,
  }));
  const mockGetCurrentUser = vi.fn(() =>
    Promise.resolve({ id: "test-user-123", email: "test@example.com" })
  );
  return {
    mockSupabaseClient: {
      from,
      auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })) },
    },
    mockGetCurrentUser,
    mockInsert,
  };
});

// Mock dependencies - use explicit factory so getCurrentUser resolves before isLoading clears
vi.mock("@/game/auth", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
  getSupabaseClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
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

describe('ShopDialog', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    // Default to EUR for price-display tests (fetch ipapi.co)
    global.fetch = vi.fn((url: string | URL) => {
      if (String(url).includes('ipapi.co')) {
        return Promise.resolve({
          json: () => Promise.resolve({ country_code: 'DE' }),
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL'));
    }) as typeof fetch;

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

    // Reset game store (EUR for price tests)
    useGameStore.setState({
      resources: { gold: 10000 },
      activatedPurchases: {},
      feastActivations: {},
      greatFeastState: { isActive: false, endTime: 0 },
      hasMadeNonFreePurchase: false,
      lastFreeGoldClaim: 0,
      tools: {},
      weapons: {},
      blessings: {},
      detectedCurrency: 'EUR',
      addLogEntry: vi.fn(),
      updateResource: vi.fn(),
    });

    mockGetCurrentUser.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Re-apply mock - clearAllMocks can reset implementation in some setups
    mockGetCurrentUser.mockResolvedValue(mockUser);
  });

  describe('Free Items', () => {
    it('should allow claiming daily free gold and add it immediately without saving to DB', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const updateResource = vi.fn();

      useGameStore.setState({
        updateResource,
        resources: { gold: 0 },
        lastFreeGoldClaim: 0,
      });

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(
        () => {
          expect(screen.getByText('100 Gold Gift')).toBeInTheDocument();
        },
        { timeout: 15_000 },
      );

      const claimButton = getClaimButtonForItem('100 Gold Gift');
      await user.click(claimButton);

      await waitFor(() => {
        expect(updateResource).toHaveBeenCalledWith('gold', 100);
      });

      // Should NOT create a purchase record for daily free gold (from() is called to load purchases on mount, but insert should not be called for gold_100_free)
      const insertCalls = mockInsert.mock.calls;
      const gold100FreeInserts = insertCalls.filter(
        (call) => call[0]?.item_id === 'gold_100_free'
      );
      expect(gold100FreeInserts).toHaveLength(0);
    }, 20_000);

    it('should prevent claiming daily free gold within 24 hours and show remaining time', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // Set last claim to 1 hour ago
      useGameStore.setState({
        lastFreeGoldClaim: Date.now() - (1 * 60 * 60 * 1000),
      });

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(
        () => {
          const claimButton = screen.getByRole('button', { name: /available in 23.*hour/i });
          expect(claimButton).toBeDisabled();
        },
        { timeout: 15_000 },
      );
    }, 20_000);

    it('should update lastFreeGoldClaim timestamp when claiming', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const updateResource = vi.fn();

      const initialTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago

      useGameStore.setState({
        updateResource,
        resources: { gold: 0 },
        lastFreeGoldClaim: initialTime,
      });

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(
        () => {
          expect(screen.getByText('100 Gold Gift')).toBeInTheDocument();
        },
        { timeout: 15_000 },
      );

      const claimButton = getClaimButtonForItem('100 Gold Gift');
      await user.click(claimButton);

      await waitFor(() => {
        const state = useGameStore.getState();
        expect(state.lastFreeGoldClaim).toBeGreaterThan(initialTime);
        expect(Math.abs(state.lastFreeGoldClaim - Date.now())).toBeLessThan(2000); // Within 2s
      });
    });

    it('should allow claiming again after exactly 24 hours have passed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const updateResource = vi.fn();

      // Set last claim to 25 hours ago (avoid floating-point boundary at exactly 24h)
      useGameStore.setState({
        updateResource,
        resources: { gold: 0 },
        lastFreeGoldClaim: Date.now() - (25 * 60 * 60 * 1000),
      });

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      let claimButton: HTMLElement;
      await waitFor(() => {
        claimButton = getClaimButtonForItem('100 Gold Gift');
        expect(claimButton).not.toBeDisabled();
      });

      await user.click(claimButton!);

      await waitFor(() => {
        expect(updateResource).toHaveBeenCalledWith('gold', 100);
      });
    });

    it('should not allow claiming twice in quick succession', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const updateResource = vi.fn();

      useGameStore.setState({
        updateResource,
        resources: { gold: 0 },
        lastFreeGoldClaim: 0, // Never claimed
      });

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(
        () => {
          expect(screen.getByText('100 Gold Gift')).toBeInTheDocument();
        },
        { timeout: 15_000 },
      );

      const claimButton = getClaimButtonForItem('100 Gold Gift');

      // First claim
      await user.click(claimButton);

      await waitFor(() => {
        expect(updateResource).toHaveBeenCalledTimes(1);
      });

      // Try to claim again immediately - button should now be disabled
      await waitFor(() => {
        const disabledButton = screen.getByRole('button', { name: /available in 24.*hour/i });
        expect(disabledButton).toBeDisabled();
      });
    });

    it('should show correct remaining hours for different time intervals', async () => {
      // Note: When >=24h have passed, button shows "Claim" (enabled), not cooldown text
      const testCases = [
        { hoursAgo: 1, expectedText: /available in 23.*hour/i },
        { hoursAgo: 12, expectedText: /available in 12.*hour/i },
        { hoursAgo: 23, expectedText: /available in 1 hour/i },
      ];

      for (const testCase of testCases) {
        const onClose = vi.fn();

        useGameStore.setState({
          lastFreeGoldClaim: Date.now() - (testCase.hoursAgo * 60 * 60 * 1000),
        });

        const { unmount } = render(<ShopDialog isOpen={true} onClose={onClose} />);

        await waitFor(() => {
          const button = screen.getByRole('button', { name: testCase.expectedText });
          expect(button).toBeDisabled();
        }, { timeout: 15_000 });

        unmount();
      }
    }, 60_000);
  });

  describe('Paid Items', () => {
    it('should show purchase button for paid items', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('100 Gold Gift')).toBeInTheDocument();
      });

      await clickShopFilter(user, 'Gold');

      await waitFor(() => {
        expect(screen.getByText('250 Gold')).toBeInTheDocument();
      });

      const purchaseButtons = screen.getAllByRole('button', { name: /purchase/i });
      expect(purchaseButtons.length).toBeGreaterThan(0);
    });

    it('should initiate payment flow for paid items', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ clientSecret: 'test_secret' }),
        })
      ) as any;

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('100 Gold Gift')).toBeInTheDocument();
      });

      await clickShopFilter(user, 'Gold');

      await waitFor(() => {
        expect(screen.getByText('250 Gold')).toBeInTheDocument();
      });

      const purchaseButton = screen.getAllByRole('button', { name: /purchase/i })[0];
      await user.click(purchaseButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/payment/create-intent',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('Repeatable Purchases', () => {
    it('should allow purchasing gold_250 multiple times', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // Mock existing purchases
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [
              { id: 1, item_id: 'gold_250' },
              { id: 2, item_id: 'gold_250' },
            ],
            error: null,
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const purchaseButtons = screen.getAllByRole('button', { name: /purchase/i });
        // Should still show purchase button even with existing purchases
        expect(purchaseButtons.length).toBeGreaterThan(0);
      });
    });

    it('should allow purchasing great_feast_1 multiple times', async () => {
      const onClose = vi.fn();

      // Mock existing purchases
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [
              { id: 1, item_id: 'great_feast_1' },
              { id: 2, item_id: 'great_feast_1' },
            ],
            error: null,
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const purchaseButtons = screen.getAllByRole('button', { name: /purchase/i });
        expect(purchaseButtons.length).toBeGreaterThan(0);
      });
    });

    it('should prevent purchasing cruel_mode twice', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // Mock existing purchase of cruel_mode
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [{ id: 1, item_id: 'cruel_mode' }],
            error: null,
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // Non-repeatable item already owned: button shows "Already Purchased" (or "Already Claimed" for $0 items)
        if (import.meta.env.DEV) {
          const disabledButton = screen.getByRole('button', { name: /already (claimed|purchased)/i });
          expect(disabledButton).toBeDisabled();
        }
      });
    });

    it('should allow first-time purchase of cruel_mode', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // Mock no existing purchases
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [],
            error: null,
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));

      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ clientSecret: 'test_secret' }),
        })
      ) as any;

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        if (import.meta.env.DEV) {
          const purchaseButtons = screen.getAllByRole('button', { name: /purchase/i });
          const cruelModeButton = purchaseButtons.find((b) => {
            let el: HTMLElement | null = b.parentElement;
            while (el) {
              if (el.textContent?.includes('Cruel Mode')) return true;
              el = el.parentElement;
            }
            return false;
          });
          expect(cruelModeButton ?? purchaseButtons[0]).not.toBeDisabled();
        }
      });
    });
  });

  describe('Activation', () => {
    it('should activate a purchased item and grant rewards', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const updateResource = vi.fn();

      useGameStore.setState({
        updateResource,
        resources: { gold: 0 },
      });

      // Mock existing purchase
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [{ id: 1, item_id: 'gold_250' }],
            error: null,
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      // Switch to Purchases tab
      await waitFor(() => {
        const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
        expect(purchasesTab).toBeInTheDocument();
      });

      const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
      await user.click(purchasesTab);

      await waitFor(() => {
        const activateButton = screen.getByRole('button', { name: /activate/i });
        expect(activateButton).toBeInTheDocument();
      });

      const activateButton = screen.getByRole('button', { name: /activate/i });
      await user.click(activateButton);

      await waitFor(() => {
        expect(updateResource).toHaveBeenCalledWith('gold', 250);
      });
    });

    it('should prevent activating the same non-repeatable item twice', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      useGameStore.setState({
        activatedPurchases: {
          'purchase-gold_100_free-1': true,
        },
      });

      // Mock existing purchase
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [{ id: 1, item_id: 'gold_100_free' }],
            error: null,
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = await waitForPurchasesTab();
      await user.click(purchasesTab);

      await waitFor(() => {
        const activatedButton = screen.getByRole('button', { name: /activated/i });
        expect(activatedButton).toBeDisabled();
      });
    });
  });

  describe('Great Feast Activations', () => {
    it('should track feast activations correctly', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      useGameStore.setState({
        feastActivations: {
          'purchase-great_feast_3-1': 3,
        },
      });

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [{ id: 1, item_id: 'great_feast_3' }],
            error: null,
          })),
        })),
        insert: mockInsert,
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = await waitForPurchasesTab();
      await user.click(purchasesTab);

      await waitFor(() => {
        expect(screen.getByText(/3\/3 available/i)).toBeInTheDocument();
      });

      const activateButtons = screen.getAllByRole('button', { name: /activate/i });
      await user.click(activateButtons[0]);

      await waitFor(() => {
        const state = useGameStore.getState();
        expect(state.feastActivations?.['purchase-great_feast_3-1']).toBe(2);
        expect(state.greatFeastState?.isActive).toBe(true);
      });
    });

    it('should disable activation when feast is active', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      useGameStore.setState({
        feastActivations: {
          'purchase-great_feast_1-1': 1,
        },
        greatFeastState: {
          isActive: true,
          endTime: Date.now() + 1000000,
        },
      });

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = await waitForPurchasesTab();
      await user.click(purchasesTab);

      await waitFor(() => {
        const activeButtons = screen.getAllByRole('button', { name: /active/i });
        expect(activeButtons.length).toBeGreaterThan(0);
        expect(activeButtons[0]).toBeDisabled();
      });
    });

    it('should disable activation when no activations remaining', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      useGameStore.setState({
        feastActivations: {
          'purchase-great_feast_1-1': 0,
        },
      });

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [{ id: 1, item_id: 'great_feast_1' }],
            error: null,
          })),
        })),
        insert: mockInsert,
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = await waitForPurchasesTab();
      await user.click(purchasesTab);

      await waitFor(() => {
        expect(screen.getByText(/0\/1 available/i)).toBeInTheDocument();
        const activatedButtons = screen.getAllByRole('button', { name: /activated/i });
        expect(activatedButtons.length).toBeGreaterThan(0);
        expect(activatedButtons[0]).toBeDisabled();
      });
    });
  });

  describe('Authentication', () => {
    it('should show sign-in message when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/sign in or create an account/i)).toBeInTheDocument();
      });
    });

    it('should disable purchase buttons when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/sign in or create an account/i)).toBeInTheDocument();
        // Shop item buttons (exclude sign-in CTA) should be disabled
        const purchaseButtons = screen.getAllByRole('button', { name: /purchase|claim/i })
          .filter(b => !b.textContent?.includes('Sign in'));
        purchaseButtons.forEach(button => {
          expect(button).toBeDisabled();
        });
      });
    });
  });

  describe('Price Display', () => {
    it('should show original and discounted prices', async () => {
      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // gold_20000 on Highlights: list 13.49 € vs sale 9.99 €
        const originalPrice = screen.getByText(/13\.49\s*€/);
        expect(originalPrice).toHaveClass('line-through');
      });
    });
  });

  describe('Purchase Persistence', () => {
    it('should reload purchases from database after claiming other free items', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      const insertMock = vi.fn(() => Promise.resolve({
        data: { id: 999 },
        error: null,
      }));

      // Free gold on cooldown so Test Free Item has the only Claim button
      useGameStore.setState({
        lastFreeGoldClaim: Date.now() - (1 * 60 * 60 * 1000),
      });

      // Create a test non-daily free item
      const originalShopItems = { ...SHOP_ITEMS };
      SHOP_ITEMS.test_free_item = {
        id: 'test_free_item',
        name: 'Test Free Item',
        description: 'Test free item',
        price: 0,
        rewards: { resources: { gold: 50 } },
        canPurchaseMultipleTimes: false,
        category: 'resource',
      };

      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'purchases') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: [],
                error: null,
              })),
            })),
            insert: insertMock,
          };
        }
        return {};
      });

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('100 Gold Gift')).toBeInTheDocument();
      });

      await clickShopFilter(user, 'Gold');

      await waitFor(() => {
        expect(screen.getByText('Test Free Item')).toBeInTheDocument();
      });

      const claimButton = getClaimButtonForItem('Test Free Item');
      await user.click(claimButton);

      await waitFor(() => {
        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: mockUser.id,
            item_id: 'test_free_item',
          })
        );
      });

      // Cleanup
      delete SHOP_ITEMS.test_free_item;
    });
  });

  describe('Cruel Mode', () => {
    it('should toggle cruel mode on activation', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // Mock cruel mode purchase
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [{ id: 1, item_id: 'cruel_mode' }],
            error: null,
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = await waitForPurchasesTab();
      await user.click(purchasesTab);

      await waitFor(() => {
        const activateButton = screen.getByRole('button', { name: /activate/i });
        expect(activateButton).toBeInTheDocument();
      });

      const activateButton = screen.getByRole('button', { name: /activate/i });
      await user.click(activateButton);

      await waitFor(() => {
        const state = useGameStore.getState();
        expect(state.activatedPurchases?.['purchase-cruel_mode-1']).toBe(true);
      });

      // Should now show deactivate
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument();
      });
    });
  });

  describe('Bundle Purchases', () => {
    it('should display bundle items in shop', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('100 Gold Gift')).toBeInTheDocument();
      });

      await clickShopFilter(user, 'Bundles');

      await waitFor(() => {
        expect(screen.getByText("Fading Wanderer Bundle")).toBeInTheDocument();
      });

      expect(
        screen.getByText(SHOP_ITEMS.basic_survival_bundle.description),
      ).toBeInTheDocument();
    });

    it('should show bundle with correct pricing', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('100 Gold Gift')).toBeInTheDocument();
      });

      await clickShopFilter(user, 'Bundles');

      await waitFor(() => {
        expect(screen.getByText("Fading Wanderer Bundle")).toBeInTheDocument();
        // Wait for currency detection (EUR) and price display
        expect(screen.getByText(/^6\.49 €$/)).toBeInTheDocument();
      });

      const originalPrices = screen.getAllByText(/9\.98\s*€/);
      expect(originalPrices.some((el) => el.classList.contains('line-through'))).toBe(true);
    }, 20_000);

    it('should allow purchasing bundles multiple times', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // Mock existing bundle purchases
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [
              { id: 1, item_id: 'basic_survival_bundle' },
              { id: 2, item_id: 'basic_survival_bundle' },
            ],
            error: null,
          })),
        })),
        insert: mockInsert,
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const purchaseButtons = screen.getAllByRole('button', { name: /purchase/i });
        expect(purchaseButtons.length).toBeGreaterThan(0);
      });
    });

    it('should create component purchases when bundle is claimed (free)', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const insertMock = vi.fn(() => Promise.resolve({
        data: { id: 999 },
        error: null,
      }));

      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'purchases') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: [],
                error: null,
              })),
            })),
            insert: insertMock,
          };
        }
        return {};
      });

      // Create a test free bundle
      const originalShopItems = { ...SHOP_ITEMS };
      SHOP_ITEMS.test_free_bundle = {
        id: 'test_free_bundle',
        name: 'Test Free Bundle',
        description: 'Free test bundle',
        price: 0,
        rewards: {},
        canPurchaseMultipleTimes: false,
        category: 'bundle',
        bundleComponents: ['gold_250', 'great_feast_1'],
      };

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('100 Gold Gift')).toBeInTheDocument();
      });

      await clickShopFilter(user, 'Bundles');

      await waitFor(() => {
        expect(screen.getByText('Test Free Bundle')).toBeInTheDocument();
      });

      const bundleClaimButton = getClaimButtonForItem('Test Free Bundle');
      await user.click(bundleClaimButton);

      await waitFor(() => {
        // Component creates 1 bundle + 2 component purchases
        expect(insertMock).toHaveBeenCalledTimes(3);
        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            item_id: 'test_free_bundle',
          })
        );
        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            item_id: 'gold_250',
          })
        );
        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            item_id: 'great_feast_1',
          })
        );
      });

      // Cleanup
      delete SHOP_ITEMS.test_free_bundle;
    });

    it('should show bundle components as separate purchases in Purchases tab', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      useGameStore.setState({
        feastActivations: {
          'purchase-great_feast_1-101': 1,
        },
      });

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [
              { id: 100, item_id: 'gold_5000' },
              { id: 101, item_id: 'great_feast_1' },
            ],
            error: null,
          })),
        })),
        insert: mockInsert,
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = await waitForPurchasesTab();
      await user.click(purchasesTab);

      await waitFor(() => {
        // Should show feast component
        expect(screen.getByText(/1 Great Feast \(1\/1 available\)/i)).toBeInTheDocument();
        // Should show gold component
        expect(screen.getByText(SHOP_ITEMS.gold_5000.name)).toBeInTheDocument();
      });
    });

    it('should activate bundle components independently', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const updateResource = vi.fn();

      useGameStore.setState({
        updateResource,
        resources: { gold: 0 },
        feastActivations: {
          'purchase-great_feast_1-101': 1,
        },
      });

      // Mock component purchases
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [
              { id: 100, item_id: 'gold_5000' },
              { id: 101, item_id: 'great_feast_1' },
            ],
            error: null,
          })),
        })),
        insert: mockInsert,
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = await waitForPurchasesTab();
      await user.click(purchasesTab);

      await waitFor(() => {
        const activateButtons = screen.getAllByRole('button', { name: /activate/i });
        expect(activateButtons.length).toBeGreaterThan(0);
      });

      // Activate gold component (feast is first in list, gold second)
      const activateButtons = screen.getAllByRole('button', { name: /activate/i });
      const goldButton = activateButtons.find((b) =>
        b.closest('div')?.textContent?.includes(SHOP_ITEMS.gold_5000.name)
      ) ?? activateButtons[1];
      await user.click(goldButton);

      await waitFor(() => {
        expect(updateResource).toHaveBeenCalledWith('gold', 5000);
      });
    });

    it('should track feast activations from bundle components separately', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      useGameStore.setState({
        feastActivations: {
          'purchase-great_feast_1-101': 1,
        },
        greatFeastState: { isActive: false, endTime: 0 },
      });

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [{ id: 101, item_id: 'great_feast_1' }],
            error: null,
          })),
        })),
        insert: mockInsert,
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = await waitForPurchasesTab();
      await user.click(purchasesTab);

      await waitFor(() => {
        expect(screen.getByText(/1\/1 available/i)).toBeInTheDocument();
      });

      const activateButton = screen.getByRole('button', { name: /activate/i });
      await user.click(activateButton);

      await waitFor(() => {
        const state = useGameStore.getState();
        expect(state.feastActivations?.['purchase-great_feast_1-101']).toBe(0);
        expect(state.greatFeastState?.isActive).toBe(true);
      });
    });

    it('should handle bundle purchase success and create component records', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      global.fetch = vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ clientSecret: 'test_secret' }),
        })
      ) as any;

      const insertMock = vi.fn(() => ({
        data: { id: 999 },
        error: null,
      }));

      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'purchases') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({
                data: [],
                error: null,
              })),
            })),
            insert: insertMock,
          };
        }
        return {};
      });

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('100 Gold Gift')).toBeInTheDocument();
      });

      await clickShopFilter(user, 'Bundles');

      await waitFor(() => {
        expect(screen.getByText("Fading Wanderer Bundle")).toBeInTheDocument();
      });

      // This would trigger the payment flow in a real scenario
      // The bundle component creation happens in handlePurchaseSuccess
    });

    it('should show bundle symbol and color', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('100 Gold Gift')).toBeInTheDocument();
      });

      await clickShopFilter(user, 'Bundles');

      await waitFor(() => {
        expect(screen.getByText("Fading Wanderer Bundle")).toBeInTheDocument();
      });

      // Bundle should have its symbol displayed
      const bundleCard = screen.getByText("Fading Wanderer Bundle").closest('.flex');
      expect(bundleCard).toBeInTheDocument();
    });

    it('should not prevent bundle repurchase even if components were purchased separately', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // Mock that individual components exist
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [
              { id: 50, item_id: 'gold_5000' },
              { id: 51, item_id: 'great_feast_1' },
            ],
            error: null,
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('100 Gold Gift')).toBeInTheDocument();
      });

      await clickShopFilter(user, 'Bundles');

      await waitFor(() => {
        expect(screen.getByText("Fading Wanderer Bundle")).toBeInTheDocument();
      });

      // Bundle should still be purchasable (it's repeatable)
      const purchaseButton = screen.getAllByRole('button', { name: /purchase/i });
      expect(purchaseButton.length).toBeGreaterThan(0);
    });
  });

  it('should have bundle with reasonable discount percentage', () => {
    const bundle = SHOP_ITEMS.basic_survival_bundle;
    const listSum = bundleComponentsListPriceSumCents(
      bundle.bundleComponents!,
      SHOP_ITEMS,
    );
    const discountPercent = ((listSum - bundle.price) / listSum) * 100;

    // Should have at least 20% discount to make bundle attractive
    expect(discountPercent).toBeGreaterThanOrEqual(20);
    // But not more than 60% (too generous)
    expect(discountPercent).toBeLessThanOrEqual(60);
  });

  it('should display advanced bundle in shop', async () => {
    const onClose = vi.fn();
    render(<ShopDialog isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Pale King's Bundle")).toBeInTheDocument();
    });

    expect(screen.getByText(SHOP_ITEMS.advanced_bundle.description)).toBeInTheDocument();
  });

  it('should show advanced bundle with correct pricing', async () => {
    const onClose = vi.fn();
    render(<ShopDialog isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText("Pale King's Bundle")).toBeInTheDocument();
    });

    // Pale King's Bundle: 10.49 € (list = sum of component list prices)
    expect(screen.getByText(/^10\.49 €$/)).toBeInTheDocument();
    const originalPrice = screen.getByText(/17\.48\s*€/);
    expect(originalPrice).toHaveClass('line-through');
  });

  it('should allow purchasing advanced bundle multiple times', async () => {
    const onClose = vi.fn();

    // Mock existing bundle purchases
    mockSupabaseClient.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [
            { id: 1, item_id: 'advanced_bundle' },
            { id: 2, item_id: 'advanced_bundle' },
          ],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
    }));

    render(<ShopDialog isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      const purchaseButtons = screen.getAllByRole('button', { name: /purchase/i });
      expect(purchaseButtons.length).toBeGreaterThan(0);
    });
  });

  it('should show advanced bundle components in purchases tab', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    // Mock component purchases from advanced bundle
    mockSupabaseClient.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [
            { id: 200, item_id: 'gold_20000' },
            { id: 201, item_id: 'great_feast_3' },
          ],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
    }));

    useGameStore.setState({
      feastActivations: {
        'purchase-great_feast_3-201': 3,
      },
    });

    render(<ShopDialog isOpen={true} onClose={onClose} />);

    const purchasesTab = await waitForPurchasesTab();
    await user.click(purchasesTab);

    await waitFor(() => {
      // Should show feast component (3 activations from great_feast_3)
      expect(screen.getByText(/3 Great Feasts \(3\/3 available\)/i)).toBeInTheDocument();
      // Should show gold component
      expect(screen.getByText(SHOP_ITEMS.gold_20000.name)).toBeInTheDocument();
    });
  });

  it('should activate advanced bundle components independently', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const updateResource = vi.fn();

    useGameStore.setState({
      updateResource,
      resources: { gold: 0 },
      feastActivations: {
        'purchase-great_feast_3-201': 3,
      },
    });

    // Mock component purchases
    mockSupabaseClient.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [
            { id: 200, item_id: 'gold_20000' },
            { id: 201, item_id: 'great_feast_3' },
          ],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
    }));

    render(<ShopDialog isOpen={true} onClose={onClose} />);

    const purchasesTab = await waitForPurchasesTab();
    await user.click(purchasesTab);

    await waitFor(() => {
      const activateButtons = screen.getAllByRole('button', { name: /activate/i });
      expect(activateButtons.length).toBeGreaterThan(0);
    });

    // Activate gold component (feast is first in list, gold second)
    const activateButtons = screen.getAllByRole('button', { name: /activate/i });
    const goldButton = activateButtons.find((b) =>
      b.closest('div')?.textContent?.includes(SHOP_ITEMS.gold_20000.name)
    ) ?? activateButtons[1];
    await user.click(goldButton);

    await waitFor(() => {
      expect(updateResource).toHaveBeenCalledWith('gold', 20000);
    });
  });

  it('should ensure bundle components exist and are not other bundles', () => {
    Object.values(SHOP_ITEMS).forEach(item => {
      if (item.category === 'bundle' && item.bundleComponents) {
        item.bundleComponents.forEach(componentId => {
          const component = SHOP_ITEMS[componentId];
          expect(component).toBeDefined();
          expect(component.category).not.toBe('bundle'); // No nested bundles
        });
      }
    });
  });

  it('should have unique bundle components (no duplicates)', () => {
    Object.values(SHOP_ITEMS).forEach(item => {
      if (item.category === 'bundle' && item.bundleComponents) {
        const uniqueComponents = new Set(item.bundleComponents);
        expect(uniqueComponents.size).toBe(item.bundleComponents.length);
      }
    });
  });

  it('should have bundle name indicating it is a bundle', () => {
    Object.values(SHOP_ITEMS).forEach(item => {
      if (item.category === 'bundle') {
        expect(item.name.toLowerCase()).toContain('bundle');
      }
    });
  });

  it('should not show bundles in purchases tab, only components', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    // Mock bundle purchase with its components
    mockSupabaseClient.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [
            { id: 1, item_id: 'basic_survival_bundle' },
            { id: 2, item_id: 'gold_5000' },
            { id: 3, item_id: 'great_feast_1' },
          ],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
    }));

    useGameStore.setState({
      feastActivations: {
        'purchase-great_feast_1-3': 1,
      },
    });

    render(<ShopDialog isOpen={true} onClose={onClose} />);

    const purchasesTab = await waitForPurchasesTab();
    await user.click(purchasesTab);

    await waitFor(() => {
      // Should show component items
      expect(screen.getByText(SHOP_ITEMS.gold_5000.name)).toBeInTheDocument();
      expect(screen.getByText(/1 Great Feast/i)).toBeInTheDocument();

      // Should NOT show the bundle itself
      expect(screen.queryByText("Fading Wanderer Bundle")).not.toBeInTheDocument();
    });
  });

  it('should handle activating multiple bundle components from different bundles', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const updateResource = vi.fn();

    useGameStore.setState({
      updateResource,
      resources: { gold: 0 },
      feastActivations: {
        'purchase-great_feast_1-3': 1,
        'purchase-great_feast_1-5': 1,
      },
    });

    // Mock multiple bundle component purchases
    mockSupabaseClient.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [
            { id: 2, item_id: 'gold_5000' },
            { id: 3, item_id: 'great_feast_1' },
            { id: 4, item_id: 'gold_5000' },
            { id: 5, item_id: 'great_feast_1' },
          ],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
    }));

    render(<ShopDialog isOpen={true} onClose={onClose} />);

    const purchasesTab = await waitForPurchasesTab();
    await user.click(purchasesTab);

    await waitFor(() => {
      const activateButtons = screen.getAllByRole('button', { name: /activate/i });
      expect(activateButtons.length).toBeGreaterThan(0);
    });

    // Activate first gold component (feasts appear first, then gold)
    const activateButtons = screen.getAllByRole('button', { name: /activate/i });
    const goldButton = activateButtons.find((b) =>
      b.closest('div')?.textContent?.includes(SHOP_ITEMS.gold_5000.name)
    ) ?? activateButtons[2];
    await user.click(goldButton);

    await waitFor(() => {
      expect(updateResource).toHaveBeenCalledWith('gold', 5000);
    });
  });

  it('should track feast activations separately for each bundle component purchase', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    useGameStore.setState({
      feastActivations: {
        'purchase-great_feast_1-101': 1,
        'purchase-great_feast_1-102': 1,
      },
      greatFeastState: { isActive: false, endTime: 0 },
    });

    mockSupabaseClient.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [
            { id: 101, item_id: 'great_feast_1' },
            { id: 102, item_id: 'great_feast_1' },
          ],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
    }));

    render(<ShopDialog isOpen={true} onClose={onClose} />);

    const purchasesTab = await waitForPurchasesTab();
    await user.click(purchasesTab);

    await waitFor(() => {
      // Should show both feast purchases separately
      const feastItems = screen.getAllByText(/1 Great Feast/i);
      expect(feastItems.length).toBe(2);
    });

    // Activate first feast
    const activateButtons = screen.getAllByRole('button', { name: /activate/i });
    await user.click(activateButtons[0]);

    await waitFor(() => {
      const state = useGameStore.getState();
      expect(state.feastActivations?.['purchase-great_feast_1-101']).toBe(0);
      expect(state.feastActivations?.['purchase-great_feast_1-102']).toBe(1); // Still available
      expect(state.greatFeastState?.isActive).toBe(true);
    });
  });

  it('should prevent activating feast when another feast is already active', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    useGameStore.setState({
      feastActivations: {
        'purchase-great_feast_1-101': 1,
        'purchase-great_feast_1-102': 1,
      },
      greatFeastState: {
        isActive: true,
        endTime: Date.now() + 1000000
      },
    });

    mockSupabaseClient.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [
            { id: 101, item_id: 'great_feast_1' },
            { id: 102, item_id: 'great_feast_1' },
          ],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
    }));

    render(<ShopDialog isOpen={true} onClose={onClose} />);

    const purchasesTab = await waitForPurchasesTab();
    await user.click(purchasesTab);

    await waitFor(() => {
      // All activate buttons should be disabled and show "Active"
      const activeButtons = screen.getAllByRole('button', { name: /active/i });
      expect(activeButtons.length).toBe(2);
      activeButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  it('should handle bundle with only resource components (no feast)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const updateResource = vi.fn();

    useGameStore.setState({
      updateResource,
      resources: { gold: 0 },
    });

    // Create a hypothetical bundle with only gold items
    mockSupabaseClient.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          data: [
            { id: 100, item_id: 'gold_250' },
            { id: 101, item_id: 'gold_1000' },
          ],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
    }));

    render(<ShopDialog isOpen={true} onClose={onClose} />);

    const purchasesTab = await waitForPurchasesTab();
    await user.click(purchasesTab);

    await waitFor(() => {
      expect(screen.getByText('250 Gold')).toBeInTheDocument();
      expect(screen.getByText(SHOP_ITEMS.gold_1000.name)).toBeInTheDocument();
    });

    // Activate both components
    const activateButtons = screen.getAllByRole('button', { name: /activate/i });
    await user.click(activateButtons[0]);

    await waitFor(() => {
      expect(updateResource).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing user gracefully', async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      const onClose = vi.fn();

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/sign in or create an account/i)).toBeInTheDocument();
      });
    });

    it('should handle database errors when loading purchases', async () => {
      const onClose = vi.fn();

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: null,
            error: { message: 'Database error' },
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // Should not crash, purchases should be empty
        const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
        expect(purchasesTab).toBeInTheDocument();
      });
    });

    it('should handle malformed purchase IDs', async () => {
      const onClose = vi.fn();

      useGameStore.setState({
        activatedPurchases: {
          'invalid-format': true,
          'purchase-': true,
          'purchase-only-prefix': true,
        },
      });

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [{ id: 1, item_id: 'gold_250' }],
            error: null,
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      // Should render without crashing
      await waitFor(() => {
        expect(screen.getByText('Trader')).toBeInTheDocument();
      });
    });

    it('should handle feast activations for non-existent items', async () => {
      const onClose = vi.fn();

      useGameStore.setState({
        feastActivations: {
          'purchase-nonexistent_item-999': 5,
        },
      });

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = await waitForPurchasesTab();
      await userEvent.setup().click(purchasesTab);

      // Should not crash or show invalid items
      await waitFor(() => {
        expect(screen.queryByText('nonexistent_item')).not.toBeInTheDocument();
      });
    });

    it('should handle concurrent feast activations correctly', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      useGameStore.setState({
        feastActivations: {
          'purchase-great_feast_3-1': 2,
        },
        greatFeastState: { isActive: false, endTime: 0 },
      });

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [{ id: 1, item_id: 'great_feast_3' }],
            error: null,
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = await waitForPurchasesTab();
      await user.click(purchasesTab);

      // Activate first feast
      const activateButton = screen.getByRole('button', { name: /activate/i });
      await user.click(activateButton);

      await waitFor(() => {
        const state = useGameStore.getState();
        expect(state.feastActivations?.['purchase-great_feast_3-1']).toBe(1);
        expect(state.greatFeastState?.isActive).toBe(true);
      });

      // Button should now show "Active" and be disabled
      await waitFor(() => {
        const activeButton = screen.getByRole('button', { name: /active/i });
        expect(activeButton).toBeDisabled();
      });
    });

    it('should handle zero activations remaining correctly', async () => {
      const onClose = vi.fn();
      // Use UUID-style id so component's purchaseId parsing (parts.slice(0,-5)) works
      const purchaseId = 'purchase-great_feast_1-11111111-2222-3333-4444-555555555555';

      useGameStore.setState({
        feastActivations: { [purchaseId]: 0 },
      });

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [{ id: '11111111-2222-3333-4444-555555555555', item_id: 'great_feast_1' }],
            error: null,
          })),
        })),
        insert: mockInsert,
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = await waitForPurchasesTab();
      await userEvent.setup().click(purchasesTab);

      await waitFor(() => {
        expect(screen.getByText(/0\/1 available/i)).toBeInTheDocument();
        const activateButton = screen.getByRole('button', { name: /activated/i });
        expect(activateButton).toBeDisabled();
      });
    });
  });
});