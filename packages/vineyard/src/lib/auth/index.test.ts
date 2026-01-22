/**
 * Auth Utilities Tests
 *
 * Tests for Better Auth integration utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signIn, getSession, signOut, isAuthenticated } from './index.js';

// Mock window.location
const mockLocation = {
  href: 'https://test.grove.place',
};

beforeEach(() => {
  // @ts-ignore - mocking window.location
  delete window.location;
  // @ts-ignore - mocking window.location
  window.location = mockLocation;
  mockLocation.href = 'https://test.grove.place';
});

describe('signIn', () => {
  it('should validate provider at runtime', () => {
    expect(() => {
      // @ts-ignore - testing runtime validation
      signIn('facebook');
    }).toThrow('Invalid provider: facebook');
  });

  it('should accept valid providers', () => {
    expect(() => signIn('google')).not.toThrow();
    expect(() => signIn('github')).not.toThrow();
  });

  it('should construct correct auth URL', () => {
    signIn('google');
    expect(window.location.href).toContain('auth-api.grove.place/api/auth/sign-in/google');
    expect(window.location.href).toContain('callbackURL=');
  });

  it('should use custom callback URL if provided', () => {
    signIn('github', 'https://custom.com/callback');
    expect(window.location.href).toContain(encodeURIComponent('https://custom.com/callback'));
  });

  it('should default to current page for callback', () => {
    mockLocation.href = 'https://test.grove.place/page';
    signIn('google');
    expect(window.location.href).toContain(encodeURIComponent('https://test.grove.place/page'));
  });
});

describe('getSession', () => {
  it('should return null user/session on fetch failure', async () => {
    // Mock fetch to throw
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await getSession();
    expect(result).toEqual({ user: null, session: null });
  });

  it('should return null user/session on non-ok response', async () => {
    // Mock fetch to return non-ok
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const result = await getSession();
    expect(result).toEqual({ user: null, session: null });
  });

  it('should return session data on success', async () => {
    const mockSession = {
      user: { id: '123', name: 'Test User', email: 'test@test.com', emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
      session: { id: 'sess-123', userId: '123', expiresAt: new Date(), createdAt: new Date() },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSession,
    });

    const result = await getSession();
    expect(result).toEqual(mockSession);
  });
});

describe('signOut', () => {
  it('should call sign-out endpoint', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchSpy;

    await signOut();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('auth-api.grove.place/api/auth/sign-out'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      })
    );
  });

  it('should redirect to default "/" on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    await signOut();

    expect(window.location.href).toBe('/');
  });

  it('should redirect to custom URL if provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    await signOut('/login');

    expect(window.location.href).toBe('/login');
  });

  it('should redirect even if fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await signOut('/home');

    expect(window.location.href).toBe('/home');
  });
});

describe('isAuthenticated', () => {
  it('should return false when no user', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: null, session: null }),
    });

    const result = await isAuthenticated();
    expect(result).toBe(false);
  });

  it('should return true when user exists', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: '123', name: 'Test', email: 'test@test.com', emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
        session: { id: 'sess-123', userId: '123', expiresAt: new Date(), createdAt: new Date() },
      }),
    });

    const result = await isAuthenticated();
    expect(result).toBe(true);
  });
});
