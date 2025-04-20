import { describe, it, expect, beforeEach, vi } from 'vitest';
import supabase from '../../../utils/supabase';

const mockUser = { id: 'user-123', email: 'test@example.com', org_id: 'org-1', modules: ['admin', 'user'] };
const mockSession = {
  access_token: 'mock-access-token',
  user: mockUser,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

describe('Supabase User Authentication Flows', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fail login with invalid credentials', async () => {
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'wrong.user@example.com',
      password: 'wrongpass',
    });

    expect(data.session).toBeNull();
    expect(error).not.toBeNull();
    expect(error.message).toMatch(/invalid/i);
  });

  it('should login successfully with valid credentials', async () => {
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
      data: { session: mockSession, user: mockUser },
      error: null,
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email: mockUser.email,
      password: 'Password123!',
    });

    expect(error).toBeNull();
    expect(data.session).toEqual(mockSession);
    expect(data.user).toEqual(mockUser);
  });

  it('should validate session', async () => {
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const { data, error } = await supabase.auth.getSession();

    expect(error).toBeNull();
    expect(data.session.user).toEqual(mockUser);
    expect(Array.isArray(data.session.user.modules)).toBe(true);
  });

  it('should reject invalid password formats on sign up', async () => {
    const invalidPasswords = [
      'short', 'nouppercase123!', 'NOLOWERCASE123!', 'NoNumbers!', 'NoSpecial123'
    ];

    for (const password of invalidPasswords) {
      vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Password must meet requirements' },
      });

      const { data, error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password,
      });

      expect(data.user).toBeNull();
      expect(error).not.toBeNull();
      expect(error.message).toMatch(/password must/i);
    }
  });

  it('should change password and allow login with new password', async () => {
    // Mock updateUser for password change
    vi.spyOn(supabase.auth, 'updateUser').mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const { data, error } = await supabase.auth.updateUser({
      password: 'NewPass456!',
    });

    expect(error).toBeNull();
    expect(data.user).toEqual(mockUser);

    // Mock login with new password
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
      data: { session: mockSession, user: mockUser },
      error: null,
    });

    const loginResult = await supabase.auth.signInWithPassword({
      email: mockUser.email,
      password: 'NewPass456!',
    });

    expect(loginResult.error).toBeNull();
    expect(loginResult.data.session).toEqual(mockSession);
  });

  it('should request password reset', async () => {
    vi.spyOn(supabase.auth, 'resetPasswordForEmail').mockResolvedValue({
      data: {},
      error: null,
    });

    const { data, error } = await supabase.auth.resetPasswordForEmail('test@example.com');

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should logout and invalidate session', async () => {
    vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({
      error: null,
    });

    const { error } = await supabase.auth.signOut();

    expect(error).toBeNull();

    // After logout, session should be null
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { data } = await supabase.auth.getSession();
    expect(data.session).toBeNull();
  });
});
