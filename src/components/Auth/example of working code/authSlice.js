import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios, { createRequest } from '../../utils/axios';

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  verifyingSession: false,
  licenseKey: {
    jwt: import.meta.env.VITE_API_JWT || null,
    privateKey: import.meta.env.VITE_API_KEY || null
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Session verification cases
      .addCase(verifySession.pending, (state) => {
        state.verifyingSession = true;
      })
      .addCase(verifySession.fulfilled, (state, action) => {
        console.log('Session verification successful:', action.payload);
        state.verifyingSession = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(verifySession.rejected, (state, action) => {
        console.log('Session verification failed:', action.payload);
        state.verifyingSession = false;
        state.isAuthenticated = false;
        state.user = null;
      })
      // Register cases
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Login cases
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        console.log('Login fulfilled payload:', action.payload);
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update user info cases
      .addCase(updateUserInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserInfo.fulfilled, (state, action) => {
        state.loading = false;
        state.user = { ...state.user, ...action.payload };
        state.error = null;
      })
      .addCase(updateUserInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Logout cases
      .addCase(logout.fulfilled, (state) => {
        const licenseKey = state.licenseKey;
        Object.assign(state, { ...initialState, licenseKey });
      })
      .addCase(logout.rejected, (state, action) => {
        state.error = action.payload;
      });
  }
});

// Thunks
export const verifySession = createAsyncThunk(
  'auth/verifySession',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Verifying session...');
      const response = await axios(createRequest({
        method: 'GET',
        url: '/api/auth/validate'
      }, true));
      console.log('Session validation response:', response.data);
      
      if (!response.data || !response.data.user) {
        console.log('Invalid session response:', response.data);
        return rejectWithValue('Invalid session response');
      }
      
      console.log('Session valid, user:', response.data.user);
      return {
        user: response.data.user
      };
    } catch (error) {
      console.log('Session verification failed:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const updateUserInfo = createAsyncThunk(
  'auth/updateUserInfo',
  async (userData, { rejectWithValue }) => {
    try {
      // In a real implementation, this would make an API call to update the user data
      // For now, we'll just return the data to update the state
      return userData;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Logging out...');
      await axios.post('/api/auth/logout');
      console.log('Logout successful');
      return null;
    } catch (error) {
      console.log('Logout failed:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const {
  clearError
} = authSlice.actions;


// Helper function to get license key auth header
export const getLicenseKeyAuth = (state) => {
  const { jwt, privateKey } = state.auth.licenseKey;
  return jwt && privateKey ? `ApiKey ${jwt}:${privateKey}` : null;
};

// Thunks
export const register = createAsyncThunk(
  'auth/register',
  async (userData, { getState, rejectWithValue }) => {
    try {
      // Check if email exists
      const emailResponse = await axios(createRequest({
        method: 'POST',
        url: '/api/admin/email/find',
        data: {
          email: userData.email,
          _orgID: import.meta.env.VITE_PUBLIC_KEY
        },
        headers: {
          Authorization: getLicenseKeyAuth(getState())
        }
      }, true));

      // 401 means no email found, which is what we want for a new registration
      if (emailResponse.status === 200 && emailResponse.data.data?.length > 0) {
        return rejectWithValue('Email already exists');
      }

      // Register user
      await axios.post('/api/auth/register', 
        {
          userName: userData.email,
          password: userData.password,
          _orgID: import.meta.env.VITE_PUBLIC_KEY,
          _partyID: userData.partyId,
          active_status: 'active',
          type: 'user'
        },
        {
          headers: {
            Authorization: getLicenseKeyAuth(getState())
          }
        }
      );

      // Auto login after registration
      const credentials = btoa(`${userData.email}:${userData.password}`);
      const loginResponse = await axios.post('/api/auth/login',
        { org_id: import.meta.env.VITE_PUBLIC_KEY },
        { 
          headers: { 
            Authorization: `Basic ${credentials}` 
          }
        }
      );
      
      // Return user data
      return {
        user: {
          ...loginResponse.data.user,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          address: userData.address,
          phone: userData.phone,
          preferredContact: userData.preferredContact
        }
      };
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      console.log('Attempting login with credentials:', { email: credentials.email });
      const response = await axios.post('/api/auth/login',
        { org_id: import.meta.env.VITE_PUBLIC_KEY },
        { 
          headers: { 
            Authorization: `Basic ${btoa(`${credentials.email}:${credentials.password}`)}` 
          }
        }
      );
      console.log('Login response:', response.data);
      
      // Ensure the response has the expected structure
      if (!response.data.user) {
        console.error('Invalid login response structure:', response.data);
        return rejectWithValue('Invalid login response from server');
      }
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export default authSlice.reducer;
