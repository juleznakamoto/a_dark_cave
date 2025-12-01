
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPaymentIntent, verifyPayment } from './stripe';

// Mock Stripe
const mockPaymentIntents = {
  create: vi.fn(),
  retrieve: vi.fn(),
};

vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      paymentIntents;
      constructor() {
        this.paymentIntents = mockPaymentIntents;
      }
    },
  };
});

describe('Stripe Shop Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent with correct amount', async () => {
      mockPaymentIntents.create.mockResolvedValue({
        client_secret: 'test_secret',
      });

      const result = await createPaymentIntent('gold_250');

      expect(mockPaymentIntents.create).toHaveBeenCalledWith({
        amount: 99, // Server-side price
        currency: 'eur',
        metadata: {
          itemId: 'gold_250',
          itemName: '250 Gold',
          priceInCents: '99',
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
      });

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
      });

      const result = await createPaymentIntent('great_feast_1');

      expect(mockPaymentIntents.create).toHaveBeenCalledWith({
        amount: 149,
        currency: 'eur',
        metadata: {
          itemId: 'great_feast_1',
          itemName: '1 Great Feast',
          priceInCents: '149',
        },
      });
    });
  });

  describe('verifyPayment', () => {
    it('should verify successful payment', async () => {
      mockPaymentIntents.retrieve.mockResolvedValue({
        status: 'succeeded',
        amount: 99,
        metadata: {
          itemId: 'gold_250',
        },
      });

      const result = await verifyPayment('test_payment_intent');

      expect(result.success).toBe(true);
      expect(result.itemId).toBe('gold_250');
    });

    it('should reject payment with incorrect amount', async () => {
      mockPaymentIntents.retrieve.mockResolvedValue({
        status: 'succeeded',
        amount: 1, // Wrong amount!
        metadata: {
          itemId: 'gold_250',
        },
      });

      const result = await verifyPayment('test_payment_intent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment amount verification failed');
    });

    it('should reject non-succeeded payments', async () => {
      mockPaymentIntents.retrieve.mockResolvedValue({
        status: 'pending',
        amount: 99,
        metadata: {
          itemId: 'gold_250',
        },
      });

      const result = await verifyPayment('test_payment_intent');

      expect(result.success).toBe(false);
    });
  });
});
