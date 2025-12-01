
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPaymentIntent, verifyPayment } from './stripe';

// Mock Stripe with proper class constructor pattern
// Mock functions are created inside the factory to avoid hoisting issues
const mockCreate = vi.fn();
const mockRetrieve = vi.fn();

vi.mock('stripe', () => {
  // Create mock functions inside the factory
  const mockCreateFn = vi.fn();
  const mockRetrieveFn = vi.fn();
  
  class MockStripe {
    paymentIntents: {
      create: typeof mockCreateFn;
      retrieve: typeof mockRetrieveFn;
    };
    
    constructor() {
      this.paymentIntents = {
        create: mockCreateFn,
        retrieve: mockRetrieveFn,
      };
    }
  }
  
  return {
    default: MockStripe,
    mockCreate: mockCreateFn,
    mockRetrieve: mockRetrieveFn,
  };
});

// Get the mock functions from the mocked module
const stripeMock = await import('stripe');
const mockCreateFromModule = (stripeMock as any).mockCreate;
const mockRetrieveFromModule = (stripeMock as any).mockRetrieve;

describe('Stripe Shop Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent with correct amount', async () => {
      mockCreateFromModule.mockResolvedValue({
        client_secret: 'test_secret',
      });

      const result = await createPaymentIntent('gold_250');

      expect(mockCreateFromModule).toHaveBeenCalledWith({
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
      mockCreateFromModule.mockResolvedValue({
        client_secret: 'test_secret',
      });

      // Attempt to pass a different client price (attack simulation)
      const result = await createPaymentIntent('gold_250', 1); // Try to pay only 1 cent

      // Should still use server price of 99 cents
      expect(mockCreateFromModule).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 99, // Server-enforced price
        })
      );
    });

    it('should handle great feast items correctly', async () => {
      mockCreateFromModule.mockResolvedValue({
        client_secret: 'test_secret',
      });

      const result = await createPaymentIntent('great_feast_1');

      expect(mockCreateFromModule).toHaveBeenCalledWith({
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
      mockRetrieveFromModule.mockResolvedValue({
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
      mockRetrieveFromModule.mockResolvedValue({
        status: 'succeeded',
        amount: 1, // Wrong amount!
        metadata: {
          itemId: 'gold_250',
        },
      });


  describe('Purchase Restrictions', () => {
    it('should track which items can be purchased multiple times', () => {
      // Verify shop items configuration
      expect(SHOP_ITEMS.gold_100_free.canPurchaseMultipleTimes).toBe(false);
      expect(SHOP_ITEMS.cruel_mode.canPurchaseMultipleTimes).toBe(false);
      expect(SHOP_ITEMS.gold_250.canPurchaseMultipleTimes).toBe(true);
      expect(SHOP_ITEMS.great_feast_1.canPurchaseMultipleTimes).toBe(true);
    });

    it('should allow payment intent creation for any item (enforcement happens at purchase verification)', async () => {
      mockCreateFromModule.mockResolvedValue({
        client_secret: 'test_secret',
      });

      // Should allow creating payment intent even for non-repeatable items
      // (the enforcement of "already purchased" should happen client-side and during purchase verification)
      const result = await createPaymentIntent('cruel_mode');
      expect(result.clientSecret).toBe('test_secret');
    });
  });


      const result = await verifyPayment('test_payment_intent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment amount verification failed');
    });

    it('should reject non-succeeded payments', async () => {
      mockRetrieveFromModule.mockResolvedValue({
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
