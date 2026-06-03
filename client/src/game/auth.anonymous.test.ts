import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const mockSignInAnonymously = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignUp = vi.fn();
const mockLinkIdentity = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockGetSession = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: vi.fn(async () => ({
    auth: {
      getSession: mockGetSession,
      signInAnonymously: mockSignInAnonymously,
      updateUser: mockUpdateUser,
      signUp: mockSignUp,
      linkIdentity: mockLinkIdentity,
      signInWithOAuth: mockSignInWithOAuth,
      getUser: mockGetUser,
      signOut: vi.fn(),
    },
  })),
  getCachedAuthUser: vi.fn(() => null),
  isAuthStateReady: vi.fn(() => false),
}));

describe('anonymous guest checkout auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost', href: 'http://localhost/' },
      history: { replaceState: vi.fn() },
    });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getSessionUser returns anonymous user without confirmed email', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'anon-abc',
            email: null,
            is_anonymous: true,
          },
        },
      },
      error: null,
    });
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'anon-abc',
          email: null,
          email_confirmed_at: null,
        },
      },
      error: null,
    });

    const { getSessionUser, getCurrentUser } = await import('./auth');
    expect(await getSessionUser()).toEqual({ id: 'anon-abc', email: '' });
    expect(await getCurrentUser()).toBeNull();
  });

  it('ensureAnonymousSession reuses existing session', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'anon-existing', email: '', is_anonymous: true },
        },
      },
      error: null,
    });

    const { ensureAnonymousSession } = await import('./auth');
    const user = await ensureAnonymousSession();
    expect(user).toEqual({ id: 'anon-existing', email: '' });
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });

  it('ensureAnonymousSession calls signInAnonymously when no session', async () => {
    mockSignInAnonymously.mockResolvedValue({
      data: { user: { id: 'anon-new', email: null } },
      error: null,
    });

    const { ensureAnonymousSession } = await import('./auth');
    const user = await ensureAnonymousSession();
    expect(user).toEqual({ id: 'anon-new', email: '' });
    expect(mockSignInAnonymously).toHaveBeenCalledOnce();
  });

  it('signUp upgrades anonymous user via updateUser instead of signUp', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'anon-abc', is_anonymous: true },
        },
      },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({
      data: { user: { id: 'anon-abc' }, session: {} },
      error: null,
    });

    const { signUp } = await import('./auth');
    await signUp('buyer@test.com', 'secret12', undefined, false);

    expect(mockUpdateUser).toHaveBeenCalledWith({
      email: 'buyer@test.com',
      password: 'secret12',
      data: {},
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('signUp uses signUp when session is not anonymous', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSignUp.mockResolvedValue({ data: { user: { id: 'new-user' } }, error: null });

    const { signUp } = await import('./auth');
    await signUp('buyer@test.com', 'secret12');

    expect(mockSignUp).toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('signInWithGoogle uses linkIdentity for anonymous session', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'anon-abc', is_anonymous: true },
        },
      },
      error: null,
    });
    mockLinkIdentity.mockResolvedValue({ data: {}, error: null });

    const { signInWithGoogle } = await import('./auth');
    await signInWithGoogle({ signupFlow: true, marketingOptIn: true });

    expect(mockLinkIdentity).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    );
    expect(mockSignInWithOAuth).not.toHaveBeenCalled();
  });
});
