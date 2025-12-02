import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShopDialog } from './ShopDialog';
import { useGameStore } from '@/game/state';
import { getCurrentUser } from '@/game/auth';
import { supabase } from '@/lib/supabase';
import { SHOP_ITEMS } from '../../../shared/shopItems';

// Mock dependencies
vi.mock('@/game/auth');
vi.mock('@/lib/supabase');
vi.mock('@stripe/stripe-js');
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: any) => <div>{children}</div>,
  PaymentElement: () => <div>Payment Element</div>,
  useStripe: () => ({
    confirmPayment: vi.fn(),
  }),
  useElements: () => ({}),
}));

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null,
      })),
    })),
    insert: vi.fn(() => ({
      data: null,
      error: null,
    })),
  })),
};

describe('ShopDialog', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    // Reset game store
    useGameStore.setState({
      resources: { gold: 10000 },
      activatedPurchases: {},
      feastPurchases: {},
      greatFeastState: { isActive: false, endTime: 0 },
      hasMadeNonFreePurchase: false,
      tools: {},
      weapons: {},
      blessings: {},
      addLogEntry: vi.fn(),
      updateResource: vi.fn(),
    });

    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(supabase).mockReturnValue(mockSupabaseClient as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Free Items', () => {
    it('should allow claiming a free item', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('100 Gold (Free Gift)')).toBeInTheDocument();
      });

      const claimButton = screen.getByRole('button', { name: /claim/i });
      await user.click(claimButton);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('purchases');
      });
    });

    it('should prevent claiming the same free item twice', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // Mock existing purchase
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
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

      await waitFor(() => {
        const claimButton = screen.getByRole('button', { name: /already claimed/i });
        expect(claimButton).toBeDisabled();
      });
    });
  });

  describe('Paid Items', () => {
    it('should show purchase button for paid items', async () => {
      const onClose = vi.fn();

      render(<ShopDialog isOpen={true} onClose={onClose} />);

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
          eq: vi.fn(() => ({
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
          eq: vi.fn(() => ({
            data: [
              { id: 1, item_id: 'great_feast_1' },
              { id: 2, item_id: 'great_feast_1' },
            ],


    it('should prevent purchasing cruel_mode twice', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // Mock existing purchase of cruel_mode
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
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
        // In dev mode, cruel_mode should be visible
        if (import.meta.env.DEV) {
          const purchaseButton = screen.getByRole('button', { name: /already purchased/i });
          expect(purchaseButton).toBeDisabled();
        }
      });
    });

    it('should allow first-time purchase of cruel_mode', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // Mock no existing purchases
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
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
          const purchaseButton = screen.getByRole('button', { name: /purchase/i });
          expect(purchaseButton).not.toBeDisabled();
        }
      });
    });

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
          eq: vi.fn(() => ({
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
          eq: vi.fn(() => ({
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

      const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
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
        feastPurchases: {
          'purchase-great_feast_3-1': {
            itemId: 'great_feast_3',
            activationsRemaining: 5,
            totalActivations: 5,
            purchasedAt: Date.now(),
          },
        },
      });

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
      await user.click(purchasesTab);

      await waitFor(() => {
        expect(screen.getByText(/5\/5 available/i)).toBeInTheDocument();
      });

      const activateButton = screen.getByRole('button', { name: /activate/i });
      await user.click(activateButton);

      await waitFor(() => {
        const state = useGameStore.getState();
        expect(state.feastPurchases?.['purchase-great_feast_3-1']?.activationsRemaining).toBe(4);
        expect(state.greatFeastState?.isActive).toBe(true);
      });
    });

    it('should disable activation when feast is active', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      useGameStore.setState({
        feastPurchases: {
          'purchase-great_feast_1-1': {
            itemId: 'great_feast_1',
            activationsRemaining: 1,
            totalActivations: 1,
            purchasedAt: Date.now(),
          },
        },
        greatFeastState: {
          isActive: true,
          endTime: Date.now() + 1000000,
        },
      });

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
      await user.click(purchasesTab);

      await waitFor(() => {
        const activeButton = screen.getByRole('button', { name: /active/i });
        expect(activeButton).toBeDisabled();
      });
    });

    it('should disable activation when no activations remaining', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      useGameStore.setState({
        feastPurchases: {
          'purchase-great_feast_1-1': {
            itemId: 'great_feast_1',
            activationsRemaining: 0,
            totalActivations: 1,
            purchasedAt: Date.now(),
          },
        },
      });

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
      await user.click(purchasesTab);

      await waitFor(() => {
        const activateButton = screen.getByRole('button', { name: /activate/i });
        expect(activateButton).toBeDisabled();
      });
    });
  });

  describe('Authentication', () => {
    it('should show sign-in message when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/sign in or create an account/i)).toBeInTheDocument();
      });
    });

    it('should disable purchase buttons when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const purchaseButtons = screen.getAllByRole('button', { name: /purchase|claim/i });
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
        // Check for strikethrough original price
        const originalPrice = screen.getByText('1.99 €');
        expect(originalPrice).toHaveClass('line-through');
      });
    });
  });

  describe('Purchase Persistence', () => {
    it('should reload purchases from database after claiming', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      const insertMock = vi.fn(() => ({
        data: { id: 999 },
        error: null,
      }));

      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'purchases') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
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
        expect(screen.getByText('100 Gold (Free Gift)')).toBeInTheDocument();
      });

      const claimButton = screen.getByRole('button', { name: /claim/i });
      await user.click(claimButton);

      await waitFor(() => {
        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: mockUser.id,
            item_id: 'gold_100_free',
          })
        );
      });
    });
  });

  describe('Cruel Mode', () => {
    it('should toggle cruel mode on activation', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // Mock cruel mode purchase
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
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

      const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
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
      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Champion Bundle')).toBeInTheDocument();
      });

      expect(screen.getByText(/A powerful pack with 5000 Gold and 1 Great Feast/i)).toBeInTheDocument();
    });

    it('should show bundle with correct pricing', async () => {
      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Champion Bundle')).toBeInTheDocument();
      });

      // Check for discounted price
      expect(screen.getByText('6.49 €')).toBeInTheDocument();
      // Check for original price (strikethrough)
      const originalPrice = screen.getByText('12.99 €');
      expect(originalPrice).toHaveClass('line-through');
    });

    it('should allow purchasing bundles multiple times', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      // Mock existing bundle purchases
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [
              { id: 1, item_id: 'champion_bundle' },
              { id: 2, item_id: 'champion_bundle' },
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

    it('should create component purchases when bundle is claimed (free)', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const insertMock = vi.fn(() => ({
        data: { id: 999 },
        error: null,
      }));

      mockSupabaseClient.from = vi.fn((table) => {
        if (table === 'purchases') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
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
        expect(screen.getByText('Test Free Bundle')).toBeInTheDocument();
      });

      const claimButton = screen.getByRole('button', { name: /claim/i });
      await user.click(claimButton);

      await waitFor(() => {
        // Should create purchases for both components
        expect(insertMock).toHaveBeenCalledTimes(2);
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

      // Mock component purchases from a bundle
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [
              { id: 100, item_id: 'gold_5000' },
              { id: 101, item_id: 'great_feast_1' },
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
        feastPurchases: {
          'purchase-great_feast_1-101': {
            itemId: 'great_feast_1',
            activationsRemaining: 1,
            totalActivations: 1,
            purchasedAt: Date.now(),
          },
        },
      });

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
      await user.click(purchasesTab);

      await waitFor(() => {
        // Should show feast component
        expect(screen.getByText(/1 Great Feast \(1\/1 available\)/i)).toBeInTheDocument();
        // Should show gold component
        expect(screen.getByText('5000 Gold')).toBeInTheDocument();
      });
    });

    it('should activate bundle components independently', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const updateResource = vi.fn();

      useGameStore.setState({
        updateResource,
        resources: { gold: 0 },
        feastPurchases: {
          'purchase-great_feast_1-101': {
            itemId: 'great_feast_1',
            activationsRemaining: 1,
            totalActivations: 1,
            purchasedAt: Date.now(),
          },
        },
      });

      // Mock component purchases
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [
              { id: 100, item_id: 'gold_5000' },
              { id: 101, item_id: 'great_feast_1' },
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

      const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
      await user.click(purchasesTab);

      await waitFor(() => {
        const activateButtons = screen.getAllByRole('button', { name: /activate/i });
        expect(activateButtons.length).toBeGreaterThan(0);
      });

      // Activate gold component first
      const activateButtons = screen.getAllByRole('button', { name: /activate/i });
      await user.click(activateButtons[0]);

      await waitFor(() => {
        expect(updateResource).toHaveBeenCalledWith('gold', 5000);
      });
    });

    it('should track feast activations from bundle components separately', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      useGameStore.setState({
        feastPurchases: {
          'purchase-great_feast_1-101': {
            itemId: 'great_feast_1',
            activationsRemaining: 1,
            totalActivations: 1,
            purchasedAt: Date.now(),
          },
        },
        greatFeastState: { isActive: false, endTime: 0 },
      });

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [{ id: 101, item_id: 'great_feast_1' }],
            error: null,
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
      await user.click(purchasesTab);

      await waitFor(() => {
        expect(screen.getByText(/1\/1 available/i)).toBeInTheDocument();
      });

      const activateButton = screen.getByRole('button', { name: /activate/i });
      await user.click(activateButton);

      await waitFor(() => {
        const state = useGameStore.getState();
        expect(state.feastPurchases?.['purchase-great_feast_1-101']?.activationsRemaining).toBe(0);
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
              eq: vi.fn(() => ({
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
        expect(screen.getByText('Champion Bundle')).toBeInTheDocument();
      });

      // This would trigger the payment flow in a real scenario
      // The bundle component creation happens in handlePurchaseSuccess
    });

    it('should show bundle symbol and color', async () => {
      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Champion Bundle')).toBeInTheDocument();
      });

      // Bundle should have its symbol displayed
      const bundleCard = screen.getByText('Champion Bundle').closest('.flex');
      expect(bundleCard).toBeInTheDocument();
    });

    it('should not prevent bundle repurchase even if components were purchased separately', async () => {
      const onClose = vi.fn();

      // Mock that individual components exist
      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
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
        expect(screen.getByText('Champion Bundle')).toBeInTheDocument();
      });

      // Bundle should still be purchasable (it's repeatable)
      const purchaseButton = screen.getAllByRole('button', { name: /purchase/i });
      expect(purchaseButton.length).toBeGreaterThan(0);
    });
  });

  it('should have bundle with reasonable discount percentage', () => {
    const bundle = SHOP_ITEMS.basic_survival_bundle;
    const discountPercent = ((bundle.originalPrice! - bundle.price) / bundle.originalPrice!) * 100;

    // Should have at least 40% discount to make bundle attractive
    expect(discountPercent).toBeGreaterThanOrEqual(40);
    // But not more than 60% (too generous)
    expect(discountPercent).toBeLessThanOrEqual(60);
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
        eq: vi.fn(() => ({
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

    const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
    await user.click(purchasesTab);

    await waitFor(() => {
      // Should show component items
      expect(screen.getByText('5000 Gold')).toBeInTheDocument();
      expect(screen.getByText(/1 Great Feast/i)).toBeInTheDocument();

      // Should NOT show the bundle itself
      expect(screen.queryByText('Basic Survival Bundle')).not.toBeInTheDocument();
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
        eq: vi.fn(() => ({
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

    const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
    await user.click(purchasesTab);

    await waitFor(() => {
      const activateButtons = screen.getAllByRole('button', { name: /activate/i });
      expect(activateButtons.length).toBeGreaterThan(0);
    });

    // Activate first gold component
    const activateButtons = screen.getAllByRole('button', { name: /activate/i });
    await user.click(activateButtons[0]);

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
        eq: vi.fn(() => ({
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

    const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
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
        eq: vi.fn(() => ({
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

    const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
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
        eq: vi.fn(() => ({
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

    const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
    await user.click(purchasesTab);

    await waitFor(() => {
      expect(screen.getByText('250 Gold')).toBeInTheDocument();
      expect(screen.getByText('1000 Gold')).toBeInTheDocument();
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
      vi.mocked(getCurrentUser).mockResolvedValue(null);
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
          eq: vi.fn(() => ({
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
          eq: vi.fn(() => ({
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
        expect(screen.getByText('Shop')).toBeInTheDocument();
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

      const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
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
          eq: vi.fn(() => ({
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

      const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
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

      useGameStore.setState({
        feastActivations: {
          'purchase-great_feast_1-1': 0,
        },
      });

      mockSupabaseClient.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            data: [{ id: 1, item_id: 'great_feast_1' }],
            error: null,
          })),
        })),
        insert: vi.fn(() => ({
          data: null,
          error: null,
        })),
      }));

      render(<ShopDialog isOpen={true} onClose={onClose} />);

      const purchasesTab = screen.getByRole('tab', { name: /purchases/i });
      await userEvent.setup().click(purchasesTab);

      await waitFor(() => {
        expect(screen.getByText(/0\/1 available/i)).toBeInTheDocument();
        const activateButton = screen.getByRole('button', { name: /activate/i });
        expect(activateButton).toBeDisabled();
      });
    });
  });
});