import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';

// Mock Stripe
vi.mock('stripe', () => {
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

import { createPaymentIntent, verifyPayment } from './stripe';

const getMockPaymentIntents = () => {
  const mockStripe = new Stripe('', { apiVersion: '2024-12-18.acacia' });
  return mockStripe.paymentIntents;
};

// Mock Supabase
const createMockSupabase = () => ({
  from: vi.fn((table: string) => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: { id: 'purchase123', item_id: 'advanced_bundle', user_id: 'user123' },
          error: null,
        })),
      })),
    })),
  })),
});

describe('Bundle Purchase Security Tests', () => {
  let mockPaymentIntents: ReturnType<typeof getMockPaymentIntents>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPaymentIntents = getMockPaymentIntents();
  });

  describe('Multiple Bundle Purchase Prevention', () => {
    it('should prevent purchasing bundle with price=0', async () => {
      // Simulate attacker trying to create payment intent with price 0
      await expect(createPaymentIntent('advanced_bundle', undefined, undefined, 0))
        .rejects.toThrow();
    });

    it('should reject payment verification if amount is 0', async () => {
      const mockSupabase = createMockSupabase();

      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 0, // Attacker bypassed payment
        status: 'succeeded',
        metadata: { itemId: 'advanced_bundle' },
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('pi_test', 'user123', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment amount verification failed');
    });

    it('should reject payment if amount does not match server price', async () => {
      const mockSupabase = createMockSupabase();

      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 100, // Wrong amount (should be 1099)
        status: 'succeeded',
        metadata: { itemId: 'advanced_bundle' },
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('pi_test', 'user123', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment amount verification failed');
    });

    it('should accept payment only with exact server price', async () => {
      const mockSupabase = createMockSupabase();

      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 1099, // Correct price for advanced_bundle
        status: 'succeeded',
        metadata: { itemId: 'advanced_bundle' },
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('pi_test', 'user123', mockSupabase);

      expect(result.success).toBe(true);
      expect(result.itemId).toBe('advanced_bundle');
    });
  });

  describe('Payment Intent Creation Security', () => {
    it('should always use server-side price for bundles', async () => {
      mockPaymentIntents.create.mockResolvedValue({
        client_secret: 'test_secret',
      } as any);

      await createPaymentIntent('advanced_bundle', undefined, undefined, 1); // Client sends wrong price

      expect(mockPaymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1099, // Server enforces correct price
        })
      );
    });

    it('should log warning when client price differs from server price', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockPaymentIntents.create.mockResolvedValue({
        client_secret: 'test_secret',
      } as any);

      await createPaymentIntent('advanced_bundle', undefined, undefined, 0);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Price manipulation attempt detected')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should reject invalid bundle item IDs', async () => {
      await expect(createPaymentIntent('fake_bundle')).rejects.toThrow('Invalid item');
    });
  });

  describe('Component Purchase Security', () => {
    it('should create component purchases with price_paid=0 and bundle_id set', async () => {
      const insertCalls: any[] = [];

      const mockFrom = vi.fn(() => {
        const insertFn = vi.fn((data: any) => {
          insertCalls.push(data);
          return {
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { id: 'purchase123', ...data },
                error: null,
              })),
            })),
          };
        });
        return { insert: insertFn };
      });

      const mockSupabase = {
        from: mockFrom,
      };

      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 1099,
        status: 'succeeded',
        metadata: { itemId: 'advanced_bundle' },
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      await verifyPayment('pi_test', 'user123', mockSupabase);

      // Should have 3 inserts: 1 bundle + 2 components
      expect(insertCalls).toHaveLength(3);

      // Bundle purchase
      expect(insertCalls[0].item_id).toBe('advanced_bundle');
      expect(insertCalls[0].price_paid).toBe(1099);
      expect(insertCalls[0].bundle_id).toBe(null);

      // Component purchases should be free and reference bundle
      expect(insertCalls[1].price_paid).toBe(0);
      expect(insertCalls[1].bundle_id).toBe('advanced_bundle');
      expect(insertCalls[2].price_paid).toBe(0);
      expect(insertCalls[2].bundle_id).toBe('advanced_bundle');
    });
  });

  describe('Edge Cases', () => {
    it('should reject payment with pending status', async () => {
      const mockSupabase = createMockSupabase();

      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 1099,
        status: 'pending',
        metadata: { itemId: 'advanced_bundle' },
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('pi_test', 'user123', mockSupabase);

      expect(result.success).toBe(false);
    });

    it('should reject payment with canceled status', async () => {
      const mockSupabase = createMockSupabase();

      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 1099,
        status: 'canceled',
        metadata: { itemId: 'advanced_bundle' },
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('pi_test', 'user123', mockSupabase);

      expect(result.success).toBe(false);
    });
  });

  describe('Race Condition Tests', () => {
    it('should handle concurrent purchase attempts gracefully', async () => {
      const mockSupabase = createMockSupabase();

      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 1099,
        status: 'succeeded',
        metadata: { itemId: 'advanced_bundle' },
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      // Simulate 3 concurrent verification attempts
      const results = await Promise.all([
        verifyPayment('pi_test', 'user123', mockSupabase),
        verifyPayment('pi_test', 'user123', mockSupabase),
        verifyPayment('pi_test', 'user123', mockSupabase),
      ]);

      // All should succeed (database should handle deduplication)
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});