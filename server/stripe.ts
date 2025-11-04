
import Stripe from 'stripe';

const stripeSecretKey = process.env.NODE_ENV === 'production' 
  ? process.env.STRIPE_SECRET_KEY_PROD 
  : process.env.STRIPE_SECRET_KEY_DEV;

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2024-12-18.acacia',
});

export interface PurchaseItem {
  id: string;
  name: string;
  price: number; // in cents
  rewards: {
    resources?: Record<string, number>;
    tools?: string[];
    weapons?: string[];
    relics?: string[];
  };
}

// Define your purchasable items
export const PURCHASE_ITEMS: Record<string, PurchaseItem> = {
  starter_pack: {
    id: 'starter_pack',
    name: 'Starter Pack',
    price: 499, // $4.99
    rewards: {
      resources: { wood: 1000, stone: 500, food: 500 },
    },
  },
  resource_bundle: {
    id: 'resource_bundle',
    name: 'Resource Bundle',
    price: 999, // $9.99
    rewards: {
      resources: { wood: 3000, stone: 2000, food: 2000, iron: 500 },
    },
  },
  rare_tools_pack: {
    id: 'rare_tools_pack',
    name: 'Rare Tools Pack',
    price: 1499, // $14.99
    rewards: {
      tools: ['steel_pickaxe', 'steel_axe', 'steel_lantern'],
    },
  },
  legendary_weapon: {
    id: 'legendary_weapon',
    name: 'Legendary Weapon',
    price: 1999, // $19.99
    rewards: {
      weapons: ['frostglass_sword'],
    },
  },
};

export async function createPaymentIntent(itemId: string) {
  const item = PURCHASE_ITEMS[itemId];
  if (!item) {
    throw new Error('Invalid item');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: item.price,
    currency: 'usd',
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
