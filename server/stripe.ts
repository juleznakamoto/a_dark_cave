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
    console.warn(`Price manipulation attempt detected for item ${itemId}. Client sent: ${clientPrice}, Server price: ${serverPrice}`);
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
      console.error(`Payment amount mismatch for item ${itemId}. Expected: ${item.price}, Got: ${paymentIntent.amount}`);
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

export async function createCheckoutSession(itemId: string) {
  const item = SHOP_ITEMS[itemId];
  if (!item) {
    throw new Error('Invalid item');
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.name,
            description: item.description,
          },
          unit_amount: item.price,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.REPL_URL || 'http://localhost:5000'}/game?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.REPL_URL || 'http://localhost:5000'}/game?payment_canceled=true`,
    metadata: {
      itemId: item.id,
      itemName: item.name,
      priceInCents: item.price.toString(),
    },
  });

  return {
    url: session.url,
    sessionId: session.id,
  };
}

export async function verifyCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === 'paid') {
    const itemId = session.metadata?.itemId;
    const item = SHOP_ITEMS[itemId || ''];
    
    // Verify the payment amount matches the server-side price
    if (item && session.amount_total !== item.price) {
      console.error(`Payment amount mismatch for item ${itemId}. Expected: ${item.price}, Got: ${session.amount_total}`);
      return { 
        success: false, 
        error: 'Payment amount verification failed' 
      };
    }
    
    return {
      success: true,
      itemId: session.metadata?.itemId,
    };
  }

  return { success: false };
}