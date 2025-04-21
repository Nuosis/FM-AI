import { vi, describe, it, expect, beforeEach } from 'vitest';
import supabaseService from '../supabaseService';

// Mock dependencies
vi.mock('../../redux/store', () => ({
  default: {
    getState: vi.fn().mockReturnValue({
      auth: {
        session: { access_token: 'mock-token' }
      }
    })
  }
}));

vi.mock('../../utils/supabase', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null })
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token' } } })
    }
  };
  
  return { default: mockSupabase };
});

describe('SupabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check if user is authenticated', () => {
    expect(supabaseService.isAuthenticated()).toBe(true);
  });

  it('should get a record from a table', async () => {
    const result = await supabaseService.getRecord('test_table', 1);
    expect(result).toEqual({ id: 1 });
  });
});