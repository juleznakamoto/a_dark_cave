
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
});
