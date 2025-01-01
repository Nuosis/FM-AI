import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  user: null,
  loading: false,
  error: null,
  failedAttempts: 0,
  isLocked: false,
  lockoutExpiry: null,
  licenseKey: {
    jwt: import.meta.env.VITE_API_JWT || null,
    privateKey: import.meta.env.VITE_API_KEY || null
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.loading = false;
      state.accessToken = action.payload.access_token;
      state.refreshToken = action.payload.refresh_token;
      state.user = action.payload.user;
      state.error = null;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.failedAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (state.failedAttempts >= 5 && !state.isLocked) {
        state.isLocked = true;
        // Lock for 15 minutes
        state.lockoutExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        state.error = 'Account locked due to too many failed attempts. Please try again in 15 minutes.';
      }
    },
    logoutSuccess: () => {
      // Preserve license key when logging out
      const licenseKey = initialState.licenseKey;
      const newState = { ...initialState, licenseKey };
      return newState;
    },
    refreshTokenStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    refreshTokenSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.accessToken = action.payload.access_token;
      state.user = action.payload.user;
      state.error = null;
    },
    refreshTokenFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      // On refresh failure, clear auth state but preserve license key
      const licenseKey = state.licenseKey;
      const newState = { ...initialState, licenseKey };
      return newState;
    },
    clearError: (state) => {
      state.error = null;
    },
    checkLockoutExpiry: (state) => {
      if (state.isLocked && state.lockoutExpiry) {
        if (new Date(state.lockoutExpiry) <= new Date()) {
          state.isLocked = false;
          state.lockoutExpiry = null;
          state.failedAttempts = 0;
          state.error = null;
        }
      }
    },
    resetFailedAttempts: (state) => {
      state.failedAttempts = 0;
      state.isLocked = false;
      state.lockoutExpiry = null;
    },
    setLicenseKey: (state, action) => {
      state.licenseKey = action.payload;
    }
  }
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logoutSuccess,
  refreshTokenStart,
  refreshTokenSuccess,
  refreshTokenFailure,
  clearError,
  checkLockoutExpiry,
  resetFailedAttempts,
  setLicenseKey
} = authSlice.actions;

// Helper function to get license key auth header
export const getLicenseKeyAuth = (state) => {
  const { jwt, privateKey } = state.auth.licenseKey;
  return jwt && privateKey ? `LicenseKey ${jwt}:${privateKey}` : null;
};

export default authSlice.reducer;
