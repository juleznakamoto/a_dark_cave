import Stripe from 'stripe';
import { SHOP_ITEMS, type ShopItem } from '../shared/shopItems';
import { createClient } from '@supabase/supabase-js';

const stripeSecretKey = process.env.NODE_ENV === 'production' 
  ? process.env.STRIPE_SECRET_KEY_PROD 
  : process.env.STRIPE_SECRET_KEY_DEV;

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2024-12-18.acacia',
});

// Initialize Supabase client
const isDev = process.env.NODE_ENV === 'development';
const supabaseUrl = isDev 
  ? process.env.VITE_SUPABASE_URL_DEV 
  : process.env.VITE_SUPABASE_URL_PROD;
const supabaseServiceKey = isDev 
  ? process.env.SUPABASE_SERVICE_ROLE_KEY_DEV 
  : process.env.SUPABASE_SERVICE_ROLE_KEY_PROD;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

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

export async function verifyPayment(paymentIntentId: string, userId?: string) {
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
    
    // Save purchase to Supabase
    if (supabase && userId && item) {
      try {
        const { error } = await supabase.from('purchases').insert({
          user_id: userId,
          item_id: itemId,
          item_name: item.name,
          price_paid: paymentIntent.amount,
          purchased_at: new Date().toISOString(),
        });

        if (error) {
          console.error('Error saving purchase to Supabase:', error);
          // Don't fail the verification - payment succeeded
        }
      } catch (error) {
        console.error('Exception saving purchase to Supabase:', error);
      }
    }
    
    return {
      success: true,
      itemId: paymentIntent.metadata.itemId,
    };
  }

  return { success: false };
}