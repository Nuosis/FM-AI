import { vi, describe, it, expect, beforeEach } from 'vitest';
import tokenStorage from '../services/tokenStorage';
import { store } from '../../../redux/store';
import {
  refreshTokenStart,
  refreshTokenSuccess,
  refreshTokenFailure,
  logoutSuccess,
  loginSuccess
} from '../../../redux/slices/authSlice';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock store dispatch
vi.mock('../../../redux/store', () => ({
  store: {
    dispatch: vi.fn(),
    getState: vi.fn()
  }
}));

// Mock fetch API
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

describe('TokenStorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.removeItem.mockReset();
    store.getState.mockReturnValue({
      auth: {
        accessToken: null,
        refreshToken: null
      }
    });
  });

  describe('parseJwt', () => {
    it('should parse valid JWT token', () => {
      const token = 'header.eyJleHAiOjE2MjM0NTY3ODl9.signature';
      const result = tokenStorage.parseJwt(token);
      expect(result).toEqual({ exp: 1623456789 });
    });

    it('should return null for invalid token', () => {
      const result = tokenStorage.parseJwt('invalid.token');
      expect(result).toBeNull();
    });
  });

  describe('needsRefresh', () => {
    it('should return false when no token provided', () => {
      expect(tokenStorage.needsRefresh(null)).toBe(false);
    });

    it('should return true when token is near expiration', () => {
      const nearExpirationToken = `header.${btoa(JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 30
      }))}.signature`;
      expect(tokenStorage.needsRefresh(nearExpirationToken)).toBe(true);
    });

    it('should return false when token is far from expiration', () => {
      const validToken = `header.${btoa(JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 3600
      }))}.signature`;
      expect(tokenStorage.needsRefresh(validToken)).toBe(false);
    });
  });

  describe('refreshTokenIfNeeded', () => {
    it('should not refresh if no tokens present', async () => {
      await tokenStorage.refreshTokenIfNeeded();
      expect(store.dispatch).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should refresh token when near expiration', async () => {
      const nearExpirationToken = `header.${btoa(JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 30
      }))}.signature`;
      
      store.getState.mockReturnValue({
        auth: {
          accessToken: nearExpirationToken,
          refreshToken: 'refresh-token'
        }
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          user: { id: '123' }
        })
      });

      await tokenStorage.refreshTokenIfNeeded();

      expect(store.dispatch).toHaveBeenCalledWith(refreshTokenStart());
      expect(store.dispatch).toHaveBeenCalledWith(
        refreshTokenSuccess({
          access_token: 'new-access-token',
          user: { id: '123' }
        })
      );
    });

    it('should handle refresh failure', async () => {
      const nearExpirationToken = `header.${btoa(JSON.stringify({
        exp: Math.floor(Date.now() / 1000) + 30
      }))}.signature`;
      
      store.getState.mockReturnValue({
        auth: {
          accessToken: nearExpirationToken,
          refreshToken: 'refresh-token'
        }
      });

      fetch.mockRejectedValueOnce(new Error('Network error'));

      await tokenStorage.refreshTokenIfNeeded();

      expect(store.dispatch).toHaveBeenCalledWith(refreshTokenStart());
      expect(store.dispatch).toHaveBeenCalledWith(
        refreshTokenFailure('Network error')
      );
      expect(store.dispatch).toHaveBeenCalledWith(logoutSuccess());
    });
  });

  describe('saveTokens', () => {
    it('should save tokens to localStorage', () => {
      const tokens = {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        user: { id: '123' }
      };
      
      tokenStorage.saveTokens(tokens.accessToken, tokens.refreshToken, tokens.user);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_tokens',
        JSON.stringify(tokens)
      );
    });

    it('should not save if tokens are missing', () => {
      tokenStorage.saveTokens(null, null, null);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('restoreTokens', () => {
    it('should restore tokens from localStorage and update Redux state', () => {
      const storedTokens = {
        accessToken: 'stored-access-token',
        refreshToken: 'stored-refresh-token',
        user: { id: '123' }
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedTokens));
      
      tokenStorage.restoreTokens();
      
      expect(store.dispatch).toHaveBeenCalledWith(loginSuccess({
        access_token: storedTokens.accessToken,
        refresh_token: storedTokens.refreshToken,
        user: storedTokens.user
      }));
    });

    it('should handle missing stored tokens', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      tokenStorage.restoreTokens();
      
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should handle invalid stored tokens', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');
      
      tokenStorage.restoreTokens();
      
      expect(store.dispatch).not.toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_tokens');
    });
  });

  describe('clearTokens', () => {
    it('should clear tokens from localStorage and dispatch logout', () => {
      tokenStorage.clearTokens();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_tokens');
      expect(store.dispatch).toHaveBeenCalledWith(logoutSuccess());
    });
  });
});
