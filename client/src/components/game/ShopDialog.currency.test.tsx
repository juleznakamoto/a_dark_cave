
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShopDialog } from './ShopDialog';
import { useGameStore } from '@/game/state';
import { getCurrentUser } from '@/game/auth';
import { supabase } from '@/lib/supabase';

// Mock dependencies
vi.mock('@/game/auth');
vi.mock('@/lib/supabase');
vi.mock('@stripe/stripe-js');
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: any) => <div>{children}</div>,
  PaymentElement: () => <div>Payment Element</div>,
  useStripe: () => ({
    confirmPayment: vi.fn(),
  }),
  useElements: () => ({}),
}));

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: [],
        error: null,
      })),
    })),
    insert: vi.fn(() => ({
      data: null,
      error: null,
    })),
  })),
};

describe('ShopDialog Currency Detection', () => {
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
  };

  beforeEach(() => {
    // Reset game store
    useGameStore.setState({
      resources: { gold: 10000 },
      activatedPurchases: {},
      feastPurchases: {},
      greatFeastState: { isActive: false, endTime: 0 },
      hasMadeNonFreePurchase: false,
      tools: {},
      weapons: {},
      blessings: {},
      addLogEntry: vi.fn(),
      updateResource: vi.fn(),
    });

    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(supabase).mockReturnValue(mockSupabaseClient as any);

    // Reset fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Currency Detection', () => {
    it('should detect EUR for German users', async () => {
      // Mock IP geolocation API to return Germany
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'DE' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // Should show Euro prices
        expect(screen.getByText(/0\.99 €/)).toBeInTheDocument();
      });
    });

    it('should detect EUR for French users', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'FR' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/0\.99 €/)).toBeInTheDocument();
      });
    });

    it('should detect EUR for Spanish users', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'ES' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/0\.99 €/)).toBeInTheDocument();
      });
    });

    it('should detect EUR for Italian users', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'IT' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/0\.99 €/)).toBeInTheDocument();
      });
    });

    it('should default to USD for US users', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'US' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // Should show USD prices
        expect(screen.getByText(/\$0\.99/)).toBeInTheDocument();
      });
    });

    it('should default to USD for UK users (not in Eurozone)', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'GB' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/\$0\.99/)).toBeInTheDocument();
      });
    });

    it('should default to USD for Canadian users', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'CA' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/\$0\.99/)).toBeInTheDocument();
      });
    });

    it('should default to USD when geolocation API fails', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // Should fall back to USD
        expect(screen.getByText(/\$0\.99/)).toBeInTheDocument();
      });
    });

    it('should default to USD when country_code is missing', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: null }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/\$0\.99/)).toBeInTheDocument();
      });
    });
  });

  describe('Currency Display', () => {
    it('should format EUR prices correctly', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'DE' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // Check various EUR price formats
        expect(screen.getByText('0.99 €')).toBeInTheDocument();
        expect(screen.getByText('1.49 €')).toBeInTheDocument();
      });
    });

    it('should format USD prices correctly', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'US' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // Check various USD price formats
        expect(screen.getByText('$0.99')).toBeInTheDocument();
        expect(screen.getByText('$1.49')).toBeInTheDocument();
      });
    });

    it('should show both original and discounted prices in correct currency', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'FR' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        // Check that bundle shows both prices in EUR
        expect(screen.getByText('6.49 €')).toBeInTheDocument();
        const originalPrice = screen.getByText('12.99 €');
        expect(originalPrice).toHaveClass('line-through');
      });
    });
  });

  describe('Payment Intent with Currency', () => {
    it('should send correct currency to payment intent creation', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'DE' }),
          } as Response);
        }
        if (url === '/api/payment/create-intent') {
          return Promise.resolve({
            json: () => Promise.resolve({ clientSecret: 'test_secret_eur' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('250 Gold')).toBeInTheDocument();
      });

      const purchaseButton = screen.getAllByRole('button', { name: /purchase/i })[0];
      await user.click(purchaseButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/payment/create-intent',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"currency":"eur"'),
          })
        );
      });
    });

    it('should send USD currency for non-EU users', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'US' }),
          } as Response);
        }
        if (url === '/api/payment/create-intent') {
          return Promise.resolve({
            json: () => Promise.resolve({ clientSecret: 'test_secret_usd' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('250 Gold')).toBeInTheDocument();
      });

      const purchaseButton = screen.getAllByRole('button', { name: /purchase/i })[0];
      await user.click(purchaseButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/payment/create-intent',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"currency":"usd"'),
          })
        );
      });
    });
  });

  describe('All EU Euro Countries', () => {
    const euEuroCountries = [
      'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT',
      'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'
    ];

    euEuroCountries.forEach((countryCode) => {
      it(`should detect EUR for ${countryCode}`, async () => {
        global.fetch = vi.fn((url) => {
          if (url === 'https://ipapi.co/json/') {
            return Promise.resolve({
              json: () => Promise.resolve({ country_code: countryCode }),
            } as Response);
          }
          return Promise.reject(new Error('Unknown URL'));
        });

        const onClose = vi.fn();
        render(<ShopDialog isOpen={true} onClose={onClose} />);

        await waitFor(() => {
          expect(screen.getByText(/0\.99 €/)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Non-EU Countries', () => {
    const nonEuCountries = [
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'CA', name: 'Canada' },
      { code: 'AU', name: 'Australia' },
      { code: 'JP', name: 'Japan' },
      { code: 'BR', name: 'Brazil' },
      { code: 'IN', name: 'India' },
      { code: 'CN', name: 'China' },
    ];

    nonEuCountries.forEach(({ code, name }) => {
      it(`should default to USD for ${name} (${code})`, async () => {
        global.fetch = vi.fn((url) => {
          if (url === 'https://ipapi.co/json/') {
            return Promise.resolve({
              json: () => Promise.resolve({ country_code: code }),
            } as Response);
          }
          return Promise.reject(new Error('Unknown URL'));
        });

        const onClose = vi.fn();
        render(<ShopDialog isOpen={true} onClose={onClose} />);

        await waitFor(() => {
          expect(screen.getByText(/\$0\.99/)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response from geolocation API', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({}),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/\$0\.99/)).toBeInTheDocument();
      });
    });

    it('should handle malformed JSON from geolocation API', async () => {
      global.fetch = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.reject(new Error('Invalid JSON')),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const onClose = vi.fn();
      render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/\$0\.99/)).toBeInTheDocument();
      });
    });

    it('should only call geolocation API once per dialog open', async () => {
      const fetchSpy = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'DE' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });
      global.fetch = fetchSpy;

      const onClose = vi.fn();
      const { rerender } = render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/0\.99 €/)).toBeInTheDocument();
      });

      // Rerender should not trigger another API call
      rerender(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const geoApiCalls = fetchSpy.mock.calls.filter(
          (call) => call[0] === 'https://ipapi.co/json/'
        );
        expect(geoApiCalls.length).toBe(1);
      });
    });

    it('should reset currency detection when dialog is closed and reopened', async () => {
      const fetchSpy = vi.fn((url) => {
        if (url === 'https://ipapi.co/json/') {
          return Promise.resolve({
            json: () => Promise.resolve({ country_code: 'US' }),
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });
      global.fetch = fetchSpy;

      const onClose = vi.fn();
      const { rerender } = render(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(/\$0\.99/)).toBeInTheDocument();
      });

      // Close dialog
      rerender(<ShopDialog isOpen={false} onClose={onClose} />);

      // Reopen dialog
      rerender(<ShopDialog isOpen={true} onClose={onClose} />);

      await waitFor(() => {
        const geoApiCalls = fetchSpy.mock.calls.filter(
          (call) => call[0] === 'https://ipapi.co/json/'
        );
        expect(geoApiCalls.length).toBe(2);
      });
    });
  });
});
