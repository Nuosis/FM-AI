import { vi, describe, it, expect, beforeEach } from 'vitest';
import userPreferences from '../services/userPreferences';
import { store } from '../../../redux/store';
import {
  loginSuccess,
  logoutSuccess
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

describe('UserPreferencesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.removeItem.mockReset();
  });

  describe('savePreferences', () => {
    it('should save user preferences to localStorage', () => {
      const user = {
        theme: 'dark',
        language: 'en',
        notifications: true,
        modules: ['admin', 'user'],
        org_id: '123'
      };
      
      userPreferences.savePreferences(user);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'user_preferences',
        JSON.stringify({ preferences: user })
      );
    });

    it('should not save if user is null', () => {
      userPreferences.savePreferences(null);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('restorePreferences', () => {
    it('should restore preferences from localStorage and update Redux state', () => {
      const storedData = {
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: true,
          modules: ['admin', 'user'],
          org_id: '123'
        }
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      userPreferences.restorePreferences();
      
      expect(store.dispatch).toHaveBeenCalledWith(loginSuccess({
        user: storedData.preferences
      }));
    });

    it('should handle missing stored preferences', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      userPreferences.restorePreferences();
      
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    it('should handle invalid stored data', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');
      
      userPreferences.restorePreferences();
      
      expect(store.dispatch).not.toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user_preferences');
    });
  });

  describe('clearStorage', () => {
    it('should clear preferences from localStorage and dispatch logout', () => {
      userPreferences.clearStorage();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user_preferences');
      expect(store.dispatch).toHaveBeenCalledWith(logoutSuccess());
    });
  });

  describe('initialize', () => {
    it('should restore preferences and return instance', () => {
      const storedData = {
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: true,
          modules: ['admin', 'user'],
          org_id: '123'
        }
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const result = userPreferences.initialize();
      
      expect(store.dispatch).toHaveBeenCalledWith(loginSuccess({
        user: storedData.preferences
      }));
      expect(result).toBe(userPreferences);
    });
  });
});
