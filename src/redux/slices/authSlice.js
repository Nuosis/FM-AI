import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import supabase from '../../utils/supabase';

const initialState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  failedAttempts: 0,
  isLocked: false,
  lockoutExpiry: null,
  licenseId: null,
  // Session-related state
  session: null,
  isRefreshing: false
};

// Async thunks for Supabase authentication
export const signInWithEmail = createAsyncThunk(
  'auth/signInWithEmail',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      // Get user profile from Supabase
      const { data: profileData, error: profileError } = await supabase
        .from('Users')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) throw profileError;
      
      return {
        session: data.session,
        user: {
          ...data.user,
          ...profileData,
          org_id: profileData.organization_id // Map to match previous structure
        }
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const signUpWithEmail = createAsyncThunk(
  'auth/signUpWithEmail',
  async ({ email, password, firstName, lastName, organizationId }, { rejectWithValue }) => {
    try {
      // Create the user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });

      if (error) throw error;
      
      // Create user profile in the Users table
      const { error: profileError } = await supabase
        .from('Users')
        .insert([
          {
            id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            email,
            organization_id: organizationId,
            active_status: 'active'
          }
        ]);
      
      if (profileError) throw profileError;
      
      return {
        session: data.session,
        user: {
          ...data.user,
          first_name: firstName,
          last_name: lastName,
          org_id: organizationId
        }
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const getSession = createAsyncThunk(
  'auth/getSession',
  async (_, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      if (!data.session) return null;
      
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('Users')
        .select('*')
        .eq('id', data.session.user.id)
        .single();
      
      if (profileError) throw profileError;
      
      return {
        session: data.session,
        user: {
          ...data.session.user,
          ...profileData,
          org_id: profileData.organization_id
        }
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

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
      state.session = action.payload.session;
      state.licenseId = action.payload.user.org_id || null;
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
  },
  extraReducers: (builder) => {
    builder
      // Sign In
      .addCase(signInWithEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signInWithEmail.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.licenseId = action.payload.user.org_id || null;
        state.error = null;
        state.failedAttempts = 0;
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Authentication failed. We recently migrated to a new authentication system. If you\'re having trouble logging in, you may need to sign up again.';
        
        if (import.meta.env.VITE_ENVIRONMENT !== 'Development') {
          state.failedAttempts += 1;
          
          if (state.failedAttempts >= 5 && !state.isLocked) {
            state.isLocked = true;
            state.lockoutExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            state.error = 'Account locked due to too many failed attempts. Please try again in 15 minutes.';
          }
        }
      })
      
      // Sign Up
      .addCase(signUpWithEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signUpWithEmail.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.licenseId = action.payload.user.org_id || null;
        state.error = null;
      })
      .addCase(signUpWithEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Registration failed';
      })
      
      // Sign Out
      .addCase(signOut.fulfilled, () => {
        return {
          ...initialState,
          loading: false
        };
      })
      
      // Get Session
      .addCase(getSession.pending, (state) => {
        state.isRefreshing = true;
      })
      .addCase(getSession.fulfilled, (state, action) => {
        state.isRefreshing = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.session = action.payload.session;
          state.licenseId = action.payload.user.org_id || null;
        }
      })
      .addCase(getSession.rejected, (state) => {
        state.isRefreshing = false;
        state.isAuthenticated = false;
        state.user = null;
        state.session = null;
      });
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
