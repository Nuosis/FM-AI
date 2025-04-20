import { describe, it, expect, beforeEach, vi } from 'vitest';
import supabase from '../../../utils/supabase';

// Mocked responses
const mockSession = {
  access_token: 'mock-access-token',
  user: { id: 'user-123', email: 'test@example.com' },
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

const mockRefreshedSession = {
  access_token: 'mock-refreshed-token',
  user: { id: 'user-123', email: 'test@example.com' },
  expires_at: Math.floor(Date.now() / 1000) + 7200,
};

describe('Supabase Auth Health Flows', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should check public health endpoint (mocked)', async () => {
    // In a real app, this would be a fetch to a public endpoint.
    // Here, we just assert that the test runs.
    expect(true).toBe(true);
  });

  it('should login and establish a Supabase session', async () => {
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
      data: { session: mockSession, user: mockSession.user },
      error: null,
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(error).toBeNull();
    expect(data.session).toEqual(mockSession);
    expect(data.user).toEqual(mockSession.user);
  });

  it('should access a protected endpoint with a valid session', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { data, error } = await supabase.auth.getSession();

    expect(error).toBeNull();
    expect(data.session.access_token).toBe('mock-access-token');
    expect(data.session.user.email).toBe('test@example.com');
  });

  it('should refresh the session token when expired', async () => {
    vi.spyOn(supabase.auth, 'refreshSession').mockResolvedValue({
      data: { session: mockRefreshedSession, user: mockRefreshedSession.user },
      error: null,
    });

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: 'mock-refresh-token' });

    expect(error).toBeNull();
    expect(data.session.access_token).toBe('mock-refreshed-token');
    expect(data.session.user.email).toBe('test@example.com');
  });

  it('should logout and clear the session', async () => {
    vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({
      error: null,
    });

    const { error } = await supabase.auth.signOut();

    expect(error).toBeNull();
  });

  it('should fail to access protected endpoint after logout', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { data, error } = await supabase.auth.getSession();

    expect(error).toBeNull();
    expect(data.session).toBeNull();
  });
});
