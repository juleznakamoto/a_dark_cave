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
import { createSupabaseMockForStripeVerify } from './stripeVerifyTestSupabase';

const getMockPaymentIntents = () => {
  const mockStripe = new Stripe('', { apiVersion: '2024-12-18.acacia' });
  return mockStripe.paymentIntents;
};

function latestChargeForVerify(): Stripe.Charge {
  return {
    billing_details: { address: { country: null } },
  } as Stripe.Charge;
}

const createMockSupabase = () =>
  createSupabaseMockForStripeVerify({
    insertSingleData: {
      id: 'purchase123',
      item_id: 'advanced_bundle',
      user_id: 'user123',
    },
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
        currency: 'eur',
        metadata: { itemId: 'advanced_bundle' },
        latest_charge: latestChargeForVerify(),
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('pi_test', 'user123', mockSupabase);

      expect(result.success).toBe(true);
      expect(result.itemId).toBe('advanced_bundle');
    });
  });

  describe('Trader\'s Gratitude discount security', () => {
    it('should accept valid discounted payment (20% off)', async () => {
      const mockSupabase = createMockSupabase();

      // advanced_bundle: 1099 -> floor(1099 * 0.8) = 879
      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 879,
        status: 'succeeded',
        currency: 'eur',
        metadata: {
          itemId: 'advanced_bundle',
          tradersGratitudeDiscountApplied: 'true',
        },
        latest_charge: latestChargeForVerify(),
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('pi_test', 'user123', mockSupabase);

      expect(result.success).toBe(true);
      expect(result.itemId).toBe('advanced_bundle');
    });

    it('should reject discounted amount without server-set metadata', async () => {
      const mockSupabase = createMockSupabase();

      // Attacker fakes discounted amount - metadata only set by server at createPaymentIntent
      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 879, // Looks like 20% off
        status: 'succeeded',
        metadata: { itemId: 'advanced_bundle' }, // No tradersGratitudeDiscountApplied
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      const result = await verifyPayment('pi_test', 'user123', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment amount verification failed');
    });

    it('should apply only server-defined 20% discount, not client-sent percentage', async () => {
      mockPaymentIntents.create.mockResolvedValue({
        client_secret: 'test_secret',
      } as any);

      // Client sends tradersGratitudeDiscount: true - server applies fixed 20%
      await createPaymentIntent(
        'advanced_bundle',
        undefined,
        undefined,
        undefined,
        undefined,
        true
      );

      // Must be floor(1099 * 0.8) = 879, not arbitrary
      expect(mockPaymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 879,
          metadata: expect.objectContaining({
            tradersGratitudeDiscountApplied: 'true',
          }),
        })
      );
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
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

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
      const mockSupabase = createMockSupabase();

      const mockIntent: Stripe.PaymentIntent = {
        id: 'pi_test',
        amount: 1099,
        status: 'succeeded',
        currency: 'eur',
        metadata: { itemId: 'advanced_bundle' },
        latest_charge: latestChargeForVerify(),
      } as Stripe.PaymentIntent;

      mockPaymentIntents.retrieve.mockResolvedValue(mockIntent);

      await verifyPayment('pi_test', 'user123', mockSupabase);

      const insertCalls = mockSupabase.insertSpy.mock.calls.map((c) => c[0]) as Record<
        string,
        unknown
      >[];

      // Should have 3 inserts: 1 bundle + 2 components
      expect(insertCalls).toHaveLength(3);

      // Bundle purchase
      expect(insertCalls[0].item_id).toBe('advanced_bundle');
      expect(insertCalls[0].price_paid).toBe(1099);
      expect(insertCalls[0].bundle_id).toBe(null);
      expect(insertCalls[0].currency).toBe('eur');

      // Component purchases should be free and reference bundle
      expect(insertCalls[1].price_paid).toBe(0);
      expect(insertCalls[1].bundle_id).toBe('advanced_bundle');
      expect(insertCalls[1].currency).toBe('eur');
      expect(insertCalls[2].price_paid).toBe(0);
      expect(insertCalls[2].bundle_id).toBe('advanced_bundle');
      expect(insertCalls[2].currency).toBe('eur');
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
        currency: 'eur',
        metadata: { itemId: 'advanced_bundle' },
        latest_charge: latestChargeForVerify(),
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