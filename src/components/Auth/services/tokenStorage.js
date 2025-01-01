import { store } from '../../../redux/store';
import { 
  refreshTokenStart, 
  refreshTokenSuccess, 
  refreshTokenFailure,
  logoutSuccess,
  loginSuccess
} from '../../../redux/slices/authSlice';

// Constants
const TOKEN_REFRESH_THRESHOLD = 60; // Refresh token if less than 60 seconds until expiration

const STORAGE_KEY = 'auth_tokens';

class TokenStorageService {
  constructor() {
    // Add event listener for window close/unload
    window.addEventListener('unload', this.clearTokens);
    
    // Initialize refresh interval reference
    this.refreshInterval = null;
  }

  // Initialize token monitoring and restore tokens
  initialize() {
    this.restoreTokens();
    this.startTokenRefreshInterval();
    return this;
  }

  // Save tokens to localStorage
  saveTokens(accessToken, refreshToken, user) {
    if (accessToken && refreshToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        accessToken,
        refreshToken,
        user
      }));
    }
  }

  // Restore tokens from localStorage
  restoreTokens() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { accessToken, refreshToken, user } = JSON.parse(stored);
        if (accessToken && refreshToken) {
          store.dispatch(loginSuccess({ 
            access_token: accessToken, 
            refresh_token: refreshToken,
            user
          }));
        }
      } catch (error) {
        console.error('Error restoring tokens:', error);
        this.clearTokens();
      }
    }
  }

  // Cleanup resources
  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    window.removeEventListener('unload', this.clearTokens);
  }

  // Parse JWT token to get payload
  parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  }

  // Get token expiration time in seconds
  getTokenExpiration(token) {
    const payload = this.parseJwt(token);
    return payload?.exp || 0;
  }

  // Check if token needs refresh
  needsRefresh(token) {
    if (!token) return false;
    
    const expiration = this.getTokenExpiration(token);
    const currentTime = Math.floor(Date.now() / 1000);
    
    return expiration - currentTime < TOKEN_REFRESH_THRESHOLD;
  }

  // Clear tokens and cleanup resources
  clearTokens = () => {
    localStorage.removeItem(STORAGE_KEY);
    store.dispatch(logoutSuccess());
    this.cleanup(); // Clean up resources
  }

  // Refresh token if needed
  async refreshTokenIfNeeded() {
    const state = store.getState().auth;
    const { accessToken, refreshToken } = state;

    if (!accessToken || !refreshToken) return;

    if (this.needsRefresh(accessToken)) {
      try {
        store.dispatch(refreshTokenStart());
        
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) throw new Error('Token refresh failed');

        const data = await response.json();
        store.dispatch(refreshTokenSuccess(data));
        this.saveTokens(data.access_token, refreshToken, data.user);
      } catch (error) {
        store.dispatch(refreshTokenFailure(error.message));
        this.clearTokens();
      }
    }
  }

  // Start interval to check token expiration
  startTokenRefreshInterval() {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // Check every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshTokenIfNeeded();
    }, 30000);
  }
}

// Create singleton instance
const tokenStorage = new TokenStorageService();

export default tokenStorage;
