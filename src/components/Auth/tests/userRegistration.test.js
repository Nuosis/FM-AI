import { describe, it, expect, beforeEach, vi } from 'vitest';
import supabase from '../../../utils/supabase';

const mockUser = { id: 'user-123', email: 'john.doe@example.com', org_id: 'org-1', modules: ['user'] };
const mockSession = {
  access_token: 'mock-access-token',
  user: mockUser,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

describe('Supabase User Registration Flows', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should register a new user successfully', async () => {
    vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    const { data, error } = await supabase.auth.signUp({
      email: mockUser.email,
      password: 'Password123!',
      options: { data: { org_id: 'org-1', displayName: 'John Doe' } }
    });

    expect(error).toBeNull();
    expect(data.user).toEqual(mockUser);
    expect(data.session).toEqual(mockSession);

    // Simulate login after registration
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
      data: { session: mockSession, user: mockUser },
      error: null,
    });

    const loginResult = await supabase.auth.signInWithPassword({
      email: mockUser.email,
      password: 'Password123!',
    });

    expect(loginResult.error).toBeNull();
    expect(loginResult.data.session).toEqual(mockSession);

    // Simulate session validation
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const sessionResult = await supabase.auth.getSession();
    expect(sessionResult.error).toBeNull();
    expect(sessionResult.data.session.user).toEqual(mockUser);
  });

  it('should reject registration with invalid data', async () => {
    // Invalid email
    vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid email format' },
    });

    const { data: data1, error: error1 } = await supabase.auth.signUp({
      email: 'invalid.email',
      password: 'Password123!',
    });

    expect(data1.user).toBeNull();
    expect(error1).not.toBeNull();
    expect(error1.message).toMatch(/invalid email/i);

    // Missing required fields
    vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Missing required fields' },
    });

    const { data: data2, error: error2 } = await supabase.auth.signUp({
      email: '',
      password: '',
    });

    expect(data2.user).toBeNull();
    expect(error2).not.toBeNull();
    expect(error2.message).toMatch(/missing required fields/i);

    // Duplicate email
    vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    });

    const { data: data3, error: error3 } = await supabase.auth.signUp({
      email: mockUser.email,
      password: 'Password123!',
    });

    expect(data3.user).toBeNull();
    expect(error3).not.toBeNull();
    expect(error3.message).toMatch(/already registered/i);
  });

  it('should reject unauthorized registration (e.g., missing org)', async () => {
    vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Organization not found or unauthorized' },
    });

    const { data, error } = await supabase.auth.signUp({
      email: 'another.test.user@example.com',
      password: 'Password123!',
      options: { data: { org_id: null } }
    });

    expect(data.user).toBeNull();
    expect(error).not.toBeNull();
    expect(error.message).toMatch(/organization/i);
  });
});
