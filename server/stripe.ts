import Stripe from 'stripe';
import { getDiscountedShopPriceCents } from '../shared/shopCheckoutPrice';
import { SHOP_ITEMS, type ShopItem } from '../shared/shopItems';

const logger = console;

const stripeSecretKey = process.env.NODE_ENV === 'production'
  ? process.env.STRIPE_SECRET_KEY_PROD
  : process.env.STRIPE_SECRET_KEY_DEV;

if (!stripeSecretKey) {
  logger.error('⚠️ STRIPE SECRET KEY NOT CONFIGURED - Payment features will not work');
}

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2024-12-18.acacia',
});

export { SHOP_ITEMS };
export type { ShopItem };

export async function createPaymentIntent(
  itemId: string,
  userEmail?: string,
  userId?: string,
  clientPrice?: number,
  currency?: string,
  tradersGratitudeDiscount?: boolean,
  cruelMode?: boolean,
  playlightFirstPurchaseDiscount?: boolean
) {
  const item = SHOP_ITEMS[itemId];
  if (!item) {
    throw new Error('Invalid item');
  }

  // SECURITY: Prevent claiming paid items as free
  // gold_100_free and cruel_mode are allowed to be free (claimed directly via client)
  if (item.price === 0 && itemId !== 'gold_100_free' && itemId !== 'cruel_mode') {
    logger.error(`Attempt to claim paid item as free: ${itemId}`);
    throw new Error('Invalid item configuration');
  }

  // CRITICAL: Always use server-side price, never trust client
  const tradersRequested =
    item.price > 0 && tradersGratitudeDiscount === true;
  const playlightRequested =
    item.price > 0 && playlightFirstPurchaseDiscount === true;
  const amount = getDiscountedShopPriceCents(item.price, {
    playlightFirstPurchase: playlightRequested,
    tradersGratitude: tradersRequested,
  });
  const tradersApplied = tradersRequested;
  const playlightApplied = playlightRequested;

  // Optional: Log if client sent a different price (potential attack attempt)
  if (clientPrice !== undefined && clientPrice !== item.price) {
    logger.warn(`Price manipulation attempt detected for item ${itemId}. Client sent: ${clientPrice}, Server price: ${item.price}`);
  }

  // Validate currency (only EUR or USD allowed)
  const validCurrency = (currency === 'eur' || currency === 'usd') ? currency : 'usd';

  const paymentIntentData: Stripe.PaymentIntentCreateParams = {
    amount,
    currency: validCurrency,
    metadata: {
      itemId: item.id,
      itemName: item.name,
      priceInCents: amount.toString(),
      currency: validCurrency,
      ...(playlightApplied && {
        playlightFirstPurchaseDiscountApplied: 'true',
      }),
      ...(tradersApplied && { tradersGratitudeDiscountApplied: 'true' }),
    },
  };

  // Add customer email if provided - this shows in Stripe dashboard
  if (userEmail) {
    paymentIntentData.receipt_email = userEmail;
    paymentIntentData.metadata.userEmail = userEmail;
  }

  // Add user ID to metadata - this helps connect Stripe payments to your database
  if (userId) {
    paymentIntentData.metadata.userId = userId;
  }

  // Track whether purchase was made during cruel mode (for stats)
  if (cruelMode !== undefined) {
    paymentIntentData.metadata.cruelMode = cruelMode ? 'true' : 'false';
  }

  const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

  return {
    clientSecret: paymentIntent.client_secret,
    item,
  };
}

export async function verifyPayment(paymentIntentId: string, userId: string, supabase: any) {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ['latest_charge'],
  });

  if (paymentIntent.status === 'succeeded') {
    const itemId = paymentIntent.metadata.itemId;
    const item = SHOP_ITEMS[itemId];
    if (item) {
      const expectedAmount = getDiscountedShopPriceCents(item.price, {
        playlightFirstPurchase:
          paymentIntent.metadata.playlightFirstPurchaseDiscountApplied ===
          'true',
        tradersGratitude:
          paymentIntent.metadata.tradersGratitudeDiscountApplied === 'true',
      });
      if (paymentIntent.amount !== expectedAmount) {
        logger.error(
          `Payment amount mismatch for item ${itemId}. Expected: ${expectedAmount}. Got: ${paymentIntent.amount}`
        );
        return {
          success: false,
          error: 'Payment amount verification failed',
        };
      }
    }

    const chargeRaw = paymentIntent.latest_charge;
    const charge =
      chargeRaw && typeof chargeRaw === 'object'
        ? (chargeRaw as Stripe.Charge)
        : null;
    if (!charge) {
      throw new Error('Missing charge on succeeded PaymentIntent');
    }

    const billingCountry =
      charge.billing_details?.address?.country ?? null;
    const cruelMode =
      paymentIntent.metadata.cruelMode === 'true'
        ? true
        : paymentIntent.metadata.cruelMode === 'false'
          ? false
          : null;

    const ccy = (paymentIntent.currency || 'eur').toLowerCase();
    const chargeCurrency = ccy === 'eur' || ccy === 'usd' ? ccy : 'eur';

    // Save purchase to database; use actual amount charged
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        item_id: itemId,
        item_name: item.name,
        price_paid: paymentIntent.amount,
        bundle_id: null,
        purchased_at: new Date().toISOString(),
        country: billingCountry,
        cruel_mode: cruelMode,
        currency: chargeCurrency,
      })
      .select()
      .single();

    if (purchaseError) {
      logger.error('❌ Failed to save purchase:', purchaseError);
      throw new Error('Failed to save purchase');
    }

    logger.log('✅ Purchase saved:', purchaseData);

    // If this is a bundle, create component purchases
    if (item.bundleComponents && item.bundleComponents.length > 0) {
      logger.log(`📦 Creating ${item.bundleComponents.length} component purchases for bundle ${itemId}`);

      for (const componentId of item.bundleComponents) {
        const componentItem = SHOP_ITEMS[componentId];
        if (componentItem) {
          const { error: componentError } = await supabase
            .from('purchases')
            .insert({
              user_id: userId,
              item_id: componentId,
              item_name: componentItem.name,
              price_paid: 0, // Components from bundle are "free"
              bundle_id: itemId, // Reference to parent bundle
              purchased_at: new Date().toISOString(),
              cruel_mode: cruelMode,
              currency: chargeCurrency,
            });

          if (componentError) {
            logger.log(`❌ Failed to save component purchase for ${componentId}:`, componentError);
          } else {
            logger.log(`✅ Component purchase saved: ${componentId}`);
          }
        }
      }
    }

    return {
      success: true,
      itemId,
      purchase: purchaseData
    };
  }

  return { success: false };
}