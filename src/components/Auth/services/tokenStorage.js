import axios from 'axios';
import { store } from '../../../redux/store';
import { 
  refreshTokenFailure,
  logoutSuccess,
  loginSuccess
} from '../../../redux/slices/authSlice';
import { createLog, LogType } from '../../../redux/slices/appSlice';

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
  async initialize() {
    try {
      await this.restoreTokens();
      // Only start refresh interval if we successfully restored tokens
      if (store.getState().auth.isAuthenticated) {
        this.startTokenRefreshInterval();
      }
    } catch (error) {
      store.dispatch(createLog(`Initialization failed: ${error.message}`, LogType.ERROR));
      this.clearTokens();
    }
    return this;
  }

  // Check if refresh token is expired
  isRefreshTokenExpired(refreshToken) {
    if (!refreshToken) {
      store.dispatch(createLog('No refresh token provided for expiration check', LogType.WARNING));
      return true;
    }
    const expiration = this.getTokenExpiration(refreshToken);
    const currentTime = Math.floor(Date.now() / 1000);
    const isExpired = expiration <= currentTime;
    
    store.dispatch(createLog(
      `Refresh token expiration check: expires=${new Date(expiration * 1000).toISOString()}, ` +
      `current=${new Date(currentTime * 1000).toISOString()}, ` +
      `isExpired=${isExpired}`,
      LogType.DEBUG
    ));
    
    return isExpired;
  }

  // Save tokens to localStorage
  saveTokens(accessToken, refreshToken, user) {
    if (accessToken && refreshToken) {
      console.log('Saving user data to storage:', user); // Debug log
      store.dispatch(createLog(`Saving user data: ${JSON.stringify(user)}`, LogType.DEBUG));
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        accessToken,
        refreshToken,
        user
      }));
    }
  }

  // Restore tokens from localStorage
  async restoreTokens() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { accessToken, refreshToken, user } = JSON.parse(stored);
        store.dispatch(createLog(`Attempting to restore user data: ${JSON.stringify(user)}`, LogType.DEBUG));
        
        if (!accessToken || !refreshToken) {
          throw new Error('Missing tokens in storage');
        }

        // Check if refresh token is expired
        if (this.isRefreshTokenExpired(refreshToken)) {
          throw new Error('Refresh token is expired');
        }

        // Check if access token is expired or close to expiry
        if (this.needsRefresh(accessToken)) {
          store.dispatch(createLog('Stored access token needs refresh, attempting refresh', LogType.DEBUG));
          
          // Create a clean axios instance for refresh
          const refreshAxios = axios.create({
            baseURL: import.meta.env.VITE_API_BASE_URL
          });
          
          const response = await refreshAxios.post('/api/auth/refresh', {
            refresh_token: refreshToken
          });

          const data = response.data;
          store.dispatch(createLog('Token refresh successful during restore', LogType.DEBUG));
          
          // Update store with new tokens
          store.dispatch(loginSuccess({ 
            access_token: data.access_token,
            refresh_token: data.refresh_token || refreshToken,
            user: data.user || user
          }));
          
          // Update storage
          this.saveTokens(data.access_token, data.refresh_token || refreshToken, data.user || user);
        } else {
          // Token is still valid, restore as is
          store.dispatch(loginSuccess({ 
            access_token: accessToken, 
            refresh_token: refreshToken,
            user
          }));
        }
      } catch (error) {
        console.error('Error restoring tokens:', error);
        store.dispatch(createLog(`Error restoring tokens: ${error.message}`, LogType.ERROR));
        this.clearTokens();
      }
    } else {
      console.log('No stored auth data found'); // Debug log
      store.dispatch(createLog('No stored auth data found', LogType.DEBUG));
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
    if (!token) {
      store.dispatch(createLog('No token provided for refresh check', LogType.WARNING));
      return false;
    }
    
    const expiration = this.getTokenExpiration(token);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiration = expiration - currentTime;
    const needsRefresh = timeUntilExpiration < TOKEN_REFRESH_THRESHOLD;
    
    store.dispatch(createLog(
      `Access token refresh check: expires=${new Date(expiration * 1000).toISOString()}, ` +
      `timeUntilExpiration=${timeUntilExpiration}s, ` +
      `threshold=${TOKEN_REFRESH_THRESHOLD}s, ` +
      `needsRefresh=${needsRefresh}`,
      LogType.DEBUG
    ));
    
    return needsRefresh;
  }

  // Clear tokens and cleanup resources
  clearTokens = () => {
    localStorage.removeItem(STORAGE_KEY);
    store.dispatch(logoutSuccess());
    this.cleanup(); // Clean up resources
  }

  // Refresh token if needed
  async refreshTokenIfNeeded() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      store.dispatch(createLog('No stored tokens found during refresh check', LogType.DEBUG));
      return;
    }

    try {
      const { accessToken, refreshToken } = JSON.parse(stored);
      if (!accessToken || !refreshToken) {
        store.dispatch(createLog('Invalid stored token data during refresh check', LogType.WARNING));
        this.clearTokens();
        return;
      }

      // Check if refresh token is expired
      if (this.isRefreshTokenExpired(refreshToken)) {
        store.dispatch(createLog('Refresh token is expired during refresh check', LogType.WARNING));
        this.clearTokens();
        return;
      }

      if (this.needsRefresh(accessToken)) {
        store.dispatch(createLog('Token refresh needed, making refresh request', LogType.DEBUG));
        
        // Create a clean axios instance for refresh
        const refreshAxios = axios.create({
          baseURL: import.meta.env.VITE_API_BASE_URL
        });
        
        const response = await refreshAxios.post('/api/auth/refresh', {
          refresh_token: refreshToken
        });

        const data = response.data;
        store.dispatch(createLog('Token refresh successful, updating storage', LogType.DEBUG));
        store.dispatch(createLog(`Refreshed user data: ${JSON.stringify(data.user)}`, LogType.DEBUG));
        
        // Silently update localStorage without Redux state change
        this.saveTokens(data.access_token, refreshToken, data.user);
      }
    } catch (error) {
      store.dispatch(refreshTokenFailure(error.message));
      this.clearTokens();
    }
  }

  // Start interval to check token expiration
  startTokenRefreshInterval() {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // Check every 12 minutes
    this.refreshInterval = setInterval(() => {
      this.refreshTokenIfNeeded();
    }, 720000); // 12 minutes in milliseconds
  }
}

// Create singleton instance
const tokenStorage = new TokenStorageService();

export default tokenStorage;
