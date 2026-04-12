/**
 * Stripe FX Quotes API (preview). Used to store EUR + USD reporting amounts at purchase time.
 * @see https://docs.stripe.com/payments/currencies/localize-prices/fx-quotes-api
 */
const FX_PREVIEW_VERSION = "2025-07-30.preview";

export type StripeFxQuoteRates = {
  id: string;
  rates?: Record<
    string,
    {
      exchange_rate?: number;
    }
  >;
};

function getStripeSecretKey(): string | null {
  return process.env.NODE_ENV === "production"
    ? process.env.STRIPE_SECRET_KEY_PROD ?? null
    : process.env.STRIPE_SECRET_KEY_DEV ?? null;
}

async function createFxQuote(
  secretKey: string,
  toCurrency: string,
  fromCurrencies: string[],
): Promise<StripeFxQuoteRates> {
  const body = new URLSearchParams();
  body.append("to_currency", toCurrency);
  for (const c of fromCurrencies) {
    body.append("from_currencies[]", c);
  }
  body.append("lock_duration", "none");
  body.append("usage[type]", "payment");

  const res = await fetch("https://api.stripe.com/v1/fx_quotes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": FX_PREVIEW_VERSION,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Stripe FX quote HTTP ${res.status}: ${raw.slice(0, 500)}`);
  }
  return JSON.parse(raw) as StripeFxQuoteRates;
}

/**
 * Returns EUR and USD minor-unit amounts for analytics. Uses Stripe's quoted exchange_rate
 * (EUR→USD: multiply EUR cents by rate; USD→EUR: divide USD cents by rate per Stripe docs).
 */
export async function reportingEurUsdCentsFromStripeFx(
  amountCents: number,
  chargeCurrency: "eur" | "usd",
): Promise<{
  reporting_eur_cents: number | null;
  reporting_usd_cents: number | null;
  stripe_fx_quote_id: string | null;
}> {
  const secretKey = getStripeSecretKey();
  if (!secretKey || amountCents <= 0) {
    return {
      reporting_eur_cents: chargeCurrency === "eur" ? amountCents : null,
      reporting_usd_cents: chargeCurrency === "usd" ? amountCents : null,
      stripe_fx_quote_id: null,
    };
  }

  try {
    if (chargeCurrency === "eur") {
      const q = await createFxQuote(secretKey, "usd", ["eur"]);
      const r = q.rates?.eur?.exchange_rate;
      if (typeof r !== "number" || !Number.isFinite(r) || r <= 0) {
        throw new Error("Missing or invalid FX rate eur→usd");
      }
      return {
        reporting_eur_cents: amountCents,
        reporting_usd_cents: Math.round(amountCents * r),
        stripe_fx_quote_id: q.id ?? null,
      };
    }

    const q = await createFxQuote(secretKey, "eur", ["usd"]);
    const r = q.rates?.usd?.exchange_rate;
    if (typeof r !== "number" || !Number.isFinite(r) || r <= 0) {
      throw new Error("Missing or invalid FX rate usd→eur");
    }
    return {
      reporting_eur_cents: Math.round(amountCents / r),
      reporting_usd_cents: amountCents,
      stripe_fx_quote_id: q.id ?? null,
    };
  } catch (err) {
    console.warn(
      "[stripeFxQuote] FX quote failed; storing charge currency only:",
      err,
    );
    return {
      reporting_eur_cents: chargeCurrency === "eur" ? amountCents : null,
      reporting_usd_cents: chargeCurrency === "usd" ? amountCents : null,
      stripe_fx_quote_id: null,
    };
  }
}
