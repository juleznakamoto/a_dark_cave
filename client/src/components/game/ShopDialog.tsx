
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/game/state';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePublishableKey = import.meta.env.PROD 
  ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_PROD 
  : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_DEV;

const stripePromise = loadStripe(stripePublishableKey || '');

interface ShopItem {
  id: string;
  name: string;
  price: number;
  rewards: {
    resources?: Record<string, number>;
    tools?: string[];
    weapons?: string[];
    relics?: string[];
  };
}

interface CheckoutFormProps {
  itemId: string;
  onSuccess: () => void;
}

function CheckoutForm({ itemId, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Payment failed');
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Verify payment on backend and grant rewards
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });

      const result = await response.json();
      if (result.success) {
        onSuccess();
      }
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && (
        <div className="text-red-500 text-sm">{errorMessage}</div>
      )}
      <Button type="submit" disabled={!stripe || isProcessing} className="w-full">
        {isProcessing ? 'Processing...' : 'Complete Purchase'}
      </Button>
    </form>
  );
}

interface ShopDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShopDialog({ isOpen, onClose }: ShopDialogProps) {
  const [items, setItems] = useState<Record<string, ShopItem>>({});
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const gameState = useGameStore();

  useState(() => {
    fetch('/api/shop/items')
      .then(res => res.json())
      .then(setItems);
  });

  const handlePurchaseClick = async (itemId: string) => {
    const response = await fetch('/api/payment/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });

    const { clientSecret } = await response.json();
    setClientSecret(clientSecret);
    setSelectedItem(itemId);
  };

  const handlePurchaseSuccess = () => {
    const item = items[selectedItem!];
    
    // Grant rewards
    if (item.rewards.resources) {
      Object.entries(item.rewards.resources).forEach(([resource, amount]) => {
        gameState.updateResource(resource as any, amount);
      });
    }
    
    if (item.rewards.tools) {
      item.rewards.tools.forEach(tool => {
        gameState.tools[tool as keyof typeof gameState.tools] = true;
      });
    }
    
    if (item.rewards.weapons) {
      item.rewards.weapons.forEach(weapon => {
        gameState.weapons[weapon as keyof typeof gameState.weapons] = true;
      });
    }

    gameState.addLogEntry({
      id: `purchase-${Date.now()}`,
      message: `You purchased ${item.name}! Rewards have been added to your inventory.`,
      timestamp: Date.now(),
      type: 'system',
    });

    setClientSecret(null);
    setSelectedItem(null);
    onClose();
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Shop</DialogTitle>
        </DialogHeader>

        {!clientSecret ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {Object.values(items).map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle>{item.name}</CardTitle>
                  <CardDescription>{formatPrice(item.price)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {item.rewards.resources && (
                      <div>
                        <strong>Resources:</strong>
                        <ul className="ml-4 list-disc">
                          {Object.entries(item.rewards.resources).map(([resource, amount]) => (
                            <li key={resource}>
                              {amount} {resource}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.rewards.tools && (
                      <div>
                        <strong>Tools:</strong>
                        <ul className="ml-4 list-disc">
                          {item.rewards.tools.map(tool => (
                            <li key={tool}>{tool.replace(/_/g, ' ')}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.rewards.weapons && (
                      <div>
                        <strong>Weapons:</strong>
                        <ul className="ml-4 list-disc">
                          {item.rewards.weapons.map(weapon => (
                            <li key={weapon}>{weapon.replace(/_/g, ' ')}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handlePurchaseClick(item.id)} className="w-full">
                    Purchase
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-4">
              Complete Purchase: {items[selectedItem!]?.name}
            </h3>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm itemId={selectedItem!} onSuccess={handlePurchaseSuccess} />
            </Elements>
            <Button variant="outline" onClick={() => setClientSecret(null)} className="w-full mt-4">
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
