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

export async function createPaymentIntent(itemId: string, clientPrice?: number) {
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

  const paymentIntent = await stripe.paymentIntents.create({
    amount: serverPrice, // Always use server-defined price
    currency: 'eur',
    metadata: {
      itemId: item.id,
      itemName: item.name,
      priceInCents: serverPrice.toString(),
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    item,
  };
}

export async function verifyPayment(paymentIntentId: string) {
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
    
    return {
      success: true,
      itemId: paymentIntent.metadata.itemId,
    };
  }

  return { success: false };
}

