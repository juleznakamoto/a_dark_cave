import { describe, it, expect } from 'vitest';
import { validatePaymentVerifyAuth } from './paymentVerifyAuth';

describe('validatePaymentVerifyAuth', () => {
  it('rejects missing userId', () => {
    expect(validatePaymentVerifyAuth(undefined, 'anon-1')).toEqual({
      status: 400,
      error: 'User ID required',
    });
  });

  it('rejects empty userId', () => {
    expect(validatePaymentVerifyAuth('  ', 'anon-1')).toEqual({
      status: 400,
      error: 'User ID required',
    });
  });

  it('rejects verify without session', () => {
    expect(validatePaymentVerifyAuth('anon-1', null)).toEqual({
      status: 401,
      error: 'Authorization required',
    });
  });

  it('rejects userId that does not match session', () => {
    expect(validatePaymentVerifyAuth('other-user', 'anon-1')).toEqual({
      status: 403,
      error: 'User ID does not match session',
    });
  });

  it('allows matching anonymous session userId', () => {
    expect(validatePaymentVerifyAuth('anon-1', 'anon-1')).toEqual({ ok: true });
  });
});
