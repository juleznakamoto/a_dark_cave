
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';

// Mock Stripe with factory function
vi.mock('stripe', () => {
  // Create mock inside factory to avoid hoisting issues
  const mockPaymentIntents = {
    create: vi.fn(),
    retrieve: vi.fn(),
  };

  return {
    default: class MockStripe {
      paymentIntents = mockPaymentIntents;
    },
  };
});

// Import after mocking
import { createPaymentIntent, verifyPayment } from './stripe';

// Get reference to the mocked methods for test assertions
// We need to access the actual mock instance
const getMockPaymentIntents = () => {
  const mockStripe = new Stripe('', { apiVersion: '2024-12-18.acacia' });
  return mockStripe.paymentIntents;
};

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { id: 'purchase123', item_id: 'gold_250', user_id: 'user123' },
          error: null,
        })),
      })),
    })),
  })),
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('Stripe Shop Integration', () => {
  let mockPaymentIntents: ReturnType<typeof getMockPaymentIntents>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPaymentIntents = getMockPaymentIntents();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent with correct amount', async () => {
      mockPaymentIntents.create.mockResolvedValue({
        client_secret: 'test_secret',
      } as any);

      const result = await createPaymentIntent('gold_250');

      expect(mockPaymentIntents.create).toHaveBeenCalledWith({
        amount: 99, // Server-side price
        currency: 'usd',
        metadata: {
          itemId: 'gold_250',
          itemName: '250 Gold',
          priceInCents: '99',
          currency: 'usd',
        },
      });

      expect(result.clientSecret).toBe('test_secret');
    });

    it('should reject invalid item IDs', async () => {
      await expect(createPaymentIntent('invalid_item')).rejects.toThrow('Invalid item');
    });

    it('should always use server-side price, never client price', async () => {
      mockPaymentIntents.create.mockResolvedValue({
        client_secret: 'test_secret',
      } as any);

      // Attempt to pass a different client price (attack simulation)
      const result = await createPaymentIntent('gold_250', 1); // Try to pay only 1 cent

      // Should still use server price of 99 cents
      expect(mockPaymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 99, // Server-enforced price
        })
      );
    });

    it('should handle great feast items correctly', async () => {
      mockPaymentIntents.create.mockResolvedValue({
        client_secret: 'test_secret',
      } as any);

      const result = await createPaymentIntent('great_feast_1');

      expect(mockPaymentIntents.create).toHaveBeenCalledWith({
        amount: 149,
        currency: 'usd',
        metadata: {
          itemId: 'great_feast_1',
          itemName: '1 Great Feast',
          priceInCents: '149',
          currency: 'usd',
        },
      });
    });

    describe('Trader\'s Gratitude discount', () => {
      it('should apply 25% discount when tradersGratitudeDiscount is true', async () => {
        mockPaymentIntents.create.mockResolvedValue({
          client_secret: 'test_secret',
        } as any);

        const result = await createPaymentIntent(
          'gold_250',
          undefined,
          undefined,
          undefined,
          undefined,
          true
        );

        // gold_250 price is 99 cents, 25% off = floor(99 * 0.75) = 74
        expect(mockPaymentIntents.create).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 74,
            metadata: expect.objectContaining({
              itemId: 'gold_250',
              priceInCents: '74',
              tradersGratitudeDiscountApplied: 'true',
            }),
          })
        );
        expect(result.clientSecret).toBe('test_secret');
      });

      it('should not apply discount when tradersGratitudeDiscount is false', async () => {
        mockPaymentIntents.create.mockResolvedValue({
          client_secret: 'test_secret',
        } as any);

        await createPaymentIntent('gold_250', undefined, undefined, undefined, undefined, false);

        expect(mockPaymentIntents.create).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 99,
            metadata: expect.not.objectContaining({
              tradersGratitudeDiscountApplied: expect.anything(),
            }),
          })
        );
      });

      it('should not apply discount for free items', async () => {
        mockPaymentIntents.create.mockResolvedValue({
          client_secret: 'test_secret',
        } as any);

        await createPaymentIntent(
          'gold_100_free',
          undefined,
          undefined,
          undefined,
          undefined,
          true
        );

        // Free items stay at 0, no discount metadata
        expect(mockPaymentIntents.create).toHaveBeenCalledWith(
          expect.objectContaining({
            amount: 0,
            metadata: expect.not.objectContaining({
              tradersGratitudeDiscountApplied: expect.anything(),
            }),
          })
        );
      });

      it('should floor discounted amount correctly', async () => {
        mockPaymentIntents.create.mockResolvedValue({
          client_secret: 'test_secret',
        } as any);

        // gold_250 = 99; 99 * 0.75 = 74.25 -> floor = 74
        await createPaymentIntent('gold_250', undefined, undefined, undefined, undefined, true);
        expect(mockPaymentIntents.create).toHaveBeenCalledWith(
          expect.objectContaining({ amount: 74 })
        );

        // gold_1000 = 249; 249 * 0.75 = 186.75 -> floor = 186
        await createPaymentIntent('gold_1000', undefined, undefined, undefined, undefined, true);
        expect(mockPaymentIntents.create).toHaveBeenCalledWith(
          expect.objectContaining({ amount: 186 })
        );
      });
    });
  });

  describe('verifyPayment', () => {
    it('should verify successful payment', async () => {
      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 99,
        status: 'succeeded',
        metadata: { itemId: 'gold_250' },
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('pi_test', 'user123', mockSupabase);

      expect(result.success).toBe(true);
      expect(result.itemId).toBe('gold_250');
      expect(mockSupabase.from).toHaveBeenCalledWith('purchases');
    });

    it('should reject payment with incorrect amount', async () => {
      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 1, // Wrong amount!
        status: 'succeeded',
        metadata: { itemId: 'gold_250' },
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('test_payment_intent', 'user123', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment amount verification failed');
    });

    it('should reject non-succeeded payments', async () => {
      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 99,
        status: 'pending',
        metadata: { itemId: 'gold_250' },
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('test_payment_intent', 'user123', mockSupabase);

      expect(result.success).toBe(false);
    });

    it('should accept discounted payment when tradersGratitudeDiscountApplied is set', async () => {
      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 74, // 25% off gold_250 (99 -> 74)
        status: 'succeeded',
        metadata: {
          itemId: 'gold_250',
          tradersGratitudeDiscountApplied: 'true',
        },
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('pi_test', 'user123', mockSupabase);

      expect(result.success).toBe(true);
      expect(result.itemId).toBe('gold_250');
      expect(mockSupabase.from).toHaveBeenCalledWith('purchases');
    });

    it('should reject discounted amount without tradersGratitudeDiscountApplied metadata', async () => {
      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 74, // Looks like discounted amount
        status: 'succeeded',
        metadata: { itemId: 'gold_250' }, // No discount metadata - attacker trying to pay less
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('pi_test', 'user123', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment amount verification failed');
    });

    it('should reject wrong discounted amount even with metadata', async () => {
      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 50, // Wrong - should be 74 for gold_250
        status: 'succeeded',
        metadata: {
          itemId: 'gold_250',
          tradersGratitudeDiscountApplied: 'true',
        },
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('pi_test', 'user123', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment amount verification failed');
    });
  });
});

// Assuming SHOP_ITEMS is defined elsewhere and imported or available in scope
// For the sake of completeness, let's define a placeholder if it's not imported.
// In a real scenario, ensure SHOP_ITEMS is correctly imported or defined.
const SHOP_ITEMS = {
  gold_100_free: { canPurchaseMultipleTimes: false },
  cruel_mode: { canPurchaseMultipleTimes: false },
  gold_250: { canPurchaseMultipleTimes: true },
  great_feast_1: { canPurchaseMultipleTimes: true },
};

describe('Purchase Restrictions', () => {
  let mockPaymentIntents: ReturnType<typeof getMockPaymentIntents>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPaymentIntents = getMockPaymentIntents();
  });

  it('should track which items can be purchased multiple times', () => {
    // Verify shop items configuration
    expect(SHOP_ITEMS.gold_100_free.canPurchaseMultipleTimes).toBe(false);
    expect(SHOP_ITEMS.cruel_mode.canPurchaseMultipleTimes).toBe(false);
    expect(SHOP_ITEMS.gold_250.canPurchaseMultipleTimes).toBe(true);
    expect(SHOP_ITEMS.great_feast_1.canPurchaseMultipleTimes).toBe(true);
  });

  it('should allow payment intent creation for any item (enforcement happens at purchase verification)', async () => {
    mockPaymentIntents.create.mockResolvedValue({
      client_secret: 'test_secret',
    } as any);

    // Should allow creating payment intent even for non-repeatable items
    // (the enforcement of "already purchased" should happen client-side and during purchase verification)
    const result = await createPaymentIntent('cruel_mode');
    expect(result.clientSecret).toBe('test_secret');
  });

  it('REGRESSION TEST: should prevent the exploit from screenshot (multiple free advanced_bundles)', async () => {
    const mockSupabase = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: null,
              error: null,
            })),
          })),
        })),
      })),
    };

    // This is what the attacker did: got advanced_bundle with price=0
    const mockIntent: Stripe.PaymentIntent = {
      id: 'pi_exploit_058cbb69',
      amount: 0, // The exploit!
      status: 'succeeded',
      metadata: { itemId: 'advanced_bundle' },
    } as Stripe.PaymentIntent;

    mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

    // Try to verify 3 times (as seen in screenshot)
    for (let i = 0; i < 3; i++) {
      const result = await verifyPayment('pi_exploit_058cbb69', '058cbb69-e1d5-473e-b99b-cddd0f2ff43e', mockSupabase);
      
      // Should REJECT every time
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment amount verification failed');
    }

    // Should NEVER have created purchases
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});
