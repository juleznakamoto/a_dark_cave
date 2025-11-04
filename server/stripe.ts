import Stripe from 'stripe';
import { SHOP_ITEMS, type ShopItem } from '../shared/shopItems';

const stripeSecretKey = process.env.NODE_ENV === 'production' 
  ? process.env.STRIPE_SECRET_KEY_PROD 
  : process.env.STRIPE_SECRET_KEY_DEV;

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2024-12-18.acacia',
});

export { SHOP_ITEMS };
export type { ShopItem };

export async function createPaymentIntent(itemId: string) {
  const item = SHOP_ITEMS[itemId];
  if (!item) {
    throw new Error('Invalid item');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: item.price,
    currency: 'eur',
    metadata: {
      itemId: item.id,
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
    return {
      success: true,
      itemId: paymentIntent.metadata.itemId,
    };
  }

  return { success: false };
}