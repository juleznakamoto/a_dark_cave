export type PaymentVerifyAuthFailure = {
  status: 400 | 401 | 403;
  error: string;
};

export type PaymentVerifyAuthResult =
  | { ok: true }
  | PaymentVerifyAuthFailure;

/** Ensures payment verify body userId matches the Bearer session (incl. anonymous). */
export function validatePaymentVerifyAuth(
  bodyUserId: unknown,
  sessionUserId: string | null | undefined,
): PaymentVerifyAuthResult {
  if (typeof bodyUserId !== 'string' || !bodyUserId.trim()) {
    return { status: 400, error: 'User ID required' };
  }
  if (!sessionUserId) {
    return { status: 401, error: 'Authorization required' };
  }
  if (sessionUserId !== bodyUserId) {
    return { status: 403, error: 'User ID does not match session' };
  }
  return { ok: true };
}
