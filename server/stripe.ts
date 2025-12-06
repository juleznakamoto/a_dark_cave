import Stripe from 'stripe';
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

export async function createPaymentIntent(itemId: string, userEmail?: string, clientPrice?: number) {
  const item = SHOP_ITEMS[itemId];
  if (!item) {
    throw new Error('Invalid item');
  }

  // CRITICAL: Always use server-side price, never trust client
  // This prevents price manipulation attacks
  const serverPrice = item.price;

  // Optional: Log if client sent a different price (potential attack attempt)
  if (clientPrice !== undefined && clientPrice !== serverPrice) {
    logger.warn(`Price manipulation attempt detected for item ${itemId}. Client sent: ${clientPrice}, Server price: ${serverPrice}`);
  }

  const paymentIntentData: Stripe.PaymentIntentCreateParams = {
    amount: serverPrice, // Always use server-defined price
    currency: 'eur',
    metadata: {
      itemId: item.id,
      itemName: item.name,
      priceInCents: serverPrice.toString(),
    },
  };

  // Add customer email if provided - this shows in Stripe dashboard
  if (userEmail) {
    paymentIntentData.receipt_email = userEmail;
  }

  const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

  return {
    clientSecret: paymentIntent.client_secret,
    item,
  };
}

export async function verifyPayment(paymentIntentId: string, userId: string, supabase: any) {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status === 'succeeded') {
    const itemId = paymentIntent.metadata.itemId;
    const item = SHOP_ITEMS[itemId];

    // Verify the payment amount matches the server-side price
    if (item && paymentIntent.amount !== item.price) {
      logger.error(`Payment amount mismatch for item ${itemId}. Expected: ${item.price}, Got: ${paymentIntent.amount}`);
      return { 
        success: false, 
        error: 'Payment amount verification failed' 
      };
    }

    // Save purchase to database
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        item_id: itemId,
        item_name: item.name,
        price_paid: item.price,
        bundle_id: null, // Bundle itself has no parent
        purchased_at: new Date().toISOString()
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
              purchased_at: new Date().toISOString()
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