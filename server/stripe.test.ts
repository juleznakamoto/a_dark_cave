
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPaymentIntent, verifyPayment } from './stripe';

// Mock Stripe with proper class constructor pattern
const mockCreate = vi.fn();
const mockRetrieve = vi.fn();

vi.mock('stripe', () => {
  class MockStripe {
    paymentIntents: {
      create: typeof mockCreate;
      retrieve: typeof mockRetrieve;
    };
    
    constructor() {
      this.paymentIntents = {
        create: mockCreate,
        retrieve: mockRetrieve,
      };
    }
  }
  
  return {
    default: MockStripe,
  };
});

describe('Stripe Shop Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent with correct amount', async () => {
      mockCreate.mockResolvedValue({
        client_secret: 'test_secret',
      });

      const result = await createPaymentIntent('gold_250');

      expect(mockCreate).toHaveBeenCalledWith({
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
      mockCreate.mockResolvedValue({
        client_secret: 'test_secret',
      });

      // Attempt to pass a different client price (attack simulation)
      const result = await createPaymentIntent('gold_250', 1); // Try to pay only 1 cent

      // Should still use server price of 99 cents
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 99, // Server-enforced price
        })
      );
    });

    it('should handle great feast items correctly', async () => {
      mockCreate.mockResolvedValue({
        client_secret: 'test_secret',
      });

      const result = await createPaymentIntent('great_feast_1');

      expect(mockCreate).toHaveBeenCalledWith({
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
      mockRetrieve.mockResolvedValue({
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
      mockRetrieve.mockResolvedValue({
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
      mockRetrieve.mockResolvedValue({
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
