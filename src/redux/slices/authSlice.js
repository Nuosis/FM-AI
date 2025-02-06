import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  failedAttempts: 0,
  isLocked: false,
  lockoutExpiry: null,
  licenseId: null
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
      state.user = action.payload.user;
      state.licenseId = action.payload.licenseId || null;
      state.error = null;
      state.failedAttempts = 0;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      
      // Skip account locking in development environment
      if (import.meta.env.VITE_ENVIRONMENT !== 'Development') {
        state.failedAttempts += 1;
        
        // Lock account after 5 failed attempts
        if (state.failedAttempts >= 5 && !state.isLocked) {
          state.isLocked = true;
          // Lock for 15 minutes
          state.lockoutExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          state.error = 'Account locked due to too many failed attempts. Please try again in 15 minutes.';
        }
      }
    },
    logoutSuccess: () => {
      return {
        ...initialState,
        loading: false,
        licenseId: null
      };
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
    }
  }
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logoutSuccess,
  clearError,
  checkLockoutExpiry,
  resetFailedAttempts
} = authSlice.actions;

export default authSlice.reducer;
