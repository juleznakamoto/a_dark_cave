import { getSessionAccessToken } from "@/game/auth";

export type PaymentVerifyResult = {
  success: boolean;
  itemId?: string;
  error?: string;
  discountMetadata?: Record<string, string | undefined>;
};

const RETRYABLE_VERIFY_ERROR =
  /failed to save purchase|network|fetch|timeout|temporarily unavailable/i;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryVerify(
  response: Response,
  result: PaymentVerifyResult,
  attempt: number,
  maxAttempts: number,
): boolean {
  if (attempt >= maxAttempts) {
    return false;
  }
  if (response.status >= 500) {
    return true;
  }
  if (!response.ok) {
    return true;
  }
  if (!result.success && result.error && RETRYABLE_VERIFY_ERROR.test(result.error)) {
    return true;
  }
  return false;
}

/** Verify a succeeded PaymentIntent on the server, with short retries for transient failures. */
export async function verifyPaymentWithRetry(
  paymentIntentId: string,
  userId: string,
  maxAttempts = 3,
): Promise<PaymentVerifyResult> {
  let lastResult: PaymentVerifyResult = { success: false };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const accessToken = await getSessionAccessToken();
      const response = await fetch("/api/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ paymentIntentId, userId }),
      });

      lastResult = (await response.json()) as PaymentVerifyResult;

      if (
        shouldRetryVerify(response, lastResult, attempt, maxAttempts)
      ) {
        await delay(400 * attempt);
        continue;
      }

      return lastResult;
    } catch {
      if (attempt >= maxAttempts) {
        return {
          success: false,
          error: "Failed to save purchase",
        };
      }
      await delay(400 * attempt);
    }
  }

  return lastResult;
}
