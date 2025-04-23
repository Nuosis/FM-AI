import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import supabaseService from '../../services/supabaseService'; // Centralized Supabase service

const licenseId = import.meta.env["VITE_LICENSE_ID"];

const initialState = {
  isAuthenticated: false,
  user: null, // Will include preferences, profile, customer info, conversations, and functions
  loading: false,
  error: null,
  failedAttempts: 0,
  isLocked: false,
  lockoutExpiry: null,
  licenseId: licenseId,
  address: null, // Address search results at top level
  // Session-related state
  session: null,
  isRefreshing: false
};

// Async thunks for Supabase authentication
export const signInWithEmail = createAsyncThunk(
  'auth/signInWithEmail',
  async ({ email, password }, thunkAPI) => {
    try {
      // Step 1: Authenticate with Supabase
      const result = await authenticateUser(email, password);
      
      // Step 2: Set session in Redux store
      thunkAPI.dispatch(setSession(result.session));
      
      // Step 3: Fetch user profile and related data
      const userData = await fetchUserData(result);
      
      // Step 4: Update user metadata if needed
      const updatedSession = await updateUserMetadataIfNeeded(result, userData.profile);
      
      // Return the complete user object with session
      return {
        session: updatedSession || result.session,
        user: {
          ...result.user,
          ...userData.profile,
          org_id: userData.profile?.organization_id || null,
          organization: userData.organization,
          preferences: userData.preferences,
          phone: userData.customer?.phone || '',
          customer: userData.customer ? {
            id: userData.customer.id,
            name: userData.customer.name,
            email: userData.customer.email
          } : null,
          address: userData.address,
          conversations: userData.conversations || [],
          functions: userData.functions || []
        },
        address: userData.address
      };
    } catch (error) {
      console.error('[Auth] Sign in failed:', error.message);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

/**
 * Authenticate user with Supabase
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} Authentication result with user and session
 */
const authenticateUser = async (email, password) => {
  try {
    const result = await supabaseService.executeQuery(
      supabase => supabase.auth.signInWithPassword({ email, password }),
      { requireAuth: false }
    );
    
    if (!result || !result.user || !result.session) {
      throw new Error('Authentication failed: Missing user or session in response');
    }
    
    return result;
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

/**
 * Fetch user profile and related data
 * @param {Object} result - Authentication result with user and session
 * @returns {Object} User data including profile, preferences, etc.
 */
const fetchUserData = async (result) => {
  // Get environment variables
  const organizationId = import.meta.env.VITE_ORGANIZATION_ID;
  
  // Initialize return object
  const userData = {
    profile: null,
    organization: null,
    preferences: {},
    customer: null,
    address: null,
    conversations: [],
    functions: []
  };
  
  // Step 1: Fetch user profile
  try {
    const profileResult = await supabaseService.executeQuery(supabase =>
      supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', result.user.id)
        .maybeSingle()
    );
    
    userData.profile = profileResult || createDefaultProfile(result, organizationId);
    
    // If profile doesn't exist, create it
    if (!profileResult) {
      try {
        const newProfile = await supabaseService.executeQuery(supabase =>
          supabase
            .from('user_profile')
            .insert([userData.profile])
            .select()
            .single()
        );
        
        if (newProfile) {
          userData.profile = newProfile;
        }
      } catch {
        // Continue with default profile if creation fails
      }
    }
  } catch {
    // Continue with default profile if fetch fails
    userData.profile = createDefaultProfile(result, organizationId);
  }
  
  // Step 2: Fetch organization data if organization ID exists
  if (organizationId) {
    try {
      const orgData = await supabaseService.executeQuery(supabase =>
        supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .maybeSingle()
      );
      
      userData.organization = orgData;
    } catch {
      // Continue without organization data
    }
  }
  
  // Step 3: Fetch user preferences
  try {
    const preferencesData = await supabaseService.executeQuery(supabase =>
      supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', result.user.id)
    );
    
    if (preferencesData) {
      userData.preferences = preferencesData.reduce((acc, pref) => {
        acc[pref.preference_key] = pref.preference_value;
        return acc;
      }, {});
      // Removed localStorage sync
      
      
      // Check if llm_storage preference exists with apiKeyStorage set to 'local'
      const llmStorage = userData.preferences.llm_storage;
      if (llmStorage && llmStorage.apiKeyStorage === 'local') {
        // Get API keys from local storage and store them in llm_api_keys table
        await syncLocalApiKeysToDatabase(result.user.id);
      }
    }
  } catch {
    // Continue with empty preferences
  }
  
  // Step 4: Fetch customer information
  try {
    userData.customer = await fetchCustomerData(result);
    
    // Step 4.1: Fetch address information and perform search if customer exists
    if (userData.customer && userData.customer.id) {
      try {
        const addressData = await supabaseService.executeQuery(supabase =>
          supabase
            .from('customer_address')
            .select('*')
            .eq('customer_id', userData.customer.id)
            .maybeSingle()
        );
        
        // Step 4.2: Perform address search if address exists
        if (addressData) {
          userData.address = await performAddressSearch(addressData);
        }
      } catch {
        // Continue without address data
      }
    }
  } catch {
    // Continue without customer data
  }
  
  // Step 5: Fetch user's conversations
  try {
    const conversationsData = await supabaseService.executeQuery(supabase =>
      supabase
        .from('conversations')
        .select('*')
        .eq('user_id', result.user.id)
    );
    
    userData.conversations = conversationsData || [];
  } catch {
    // Continue with empty conversations
  }
  
  // Step 6: Fetch user's functions
  try {
    const functionsData = await supabaseService.executeQuery(supabase =>
      supabase
        .from('functions')
        .select('*')
        .eq('user_id', result.user.id)
    );
    
    userData.functions = functionsData || [];
  } catch {
    // Continue with empty functions
  }
  
  return userData;
};

/**
 * Create default profile for user
 * @param {Object} result - Authentication result with user
 * @param {string} organizationId - Organization ID from environment
 * @returns {Object} Default profile object
 */
const createDefaultProfile = (result, organizationId) => {
  return {
    user_id: result.user.id,
    first_name: result.user.user_metadata?.first_name || '',
    last_name: result.user.user_metadata?.last_name || '',
    email: result.user.email,
    organization_id: organizationId,
    role: 'user',
    active_status: 'active'
  };
};

// Removed syncLlmPreferencesWithLocalStorage function

/**
 * Fetch customer data for user
 * @param {Object} result - Authentication result with user
 * @returns {Object|null} Customer data or null
 */
const fetchCustomerData = async (result) => {
  // Try to find customer user data
  let customerUserData = null;
  
  // First try with user ID
  const userData = await supabaseService.executeQuery(supabase =>
    supabase
      .from('customer_user')
      .select(`
        customer_id,
        customers:customer_id (
          name,
          first_name,
          last_name
        )
      `)
      .eq('user_id', result.user.id)
      .maybeSingle()
  );
  
  if (userData) {
    customerUserData = userData;
  } else {
    // Try with email
    const altUserData = await supabaseService.executeQuery(supabase =>
      supabase
        .from('customer_email')
        .select(`
          customer_id,
          customers:customer_id (
            name,
            first_name,
            last_name
          )
        `)
        .eq('email', result.user.email)
        .maybeSingle()
    );
    
    if (altUserData) {
      customerUserData = altUserData;
    }
  }
  
  if (!customerUserData || !customerUserData.customers) {
    return null;
  }
  
  // Fetch customer phone if customer exists
  let customerPhone = null;
  try {
    const phoneData = await supabaseService.executeQuery(supabase =>
      supabase
        .from('customer_phone')
        .select('*')
        .eq('customer_id', customerUserData.customer_id)
        .eq('is_primary', true)
        .maybeSingle()
    );
    
    customerPhone = phoneData?.phone || null;
  } catch {
    // Continue without phone data
  }
  
  // Get customer email
  let customerEmail = result.user.email;
  if (!customerEmail) {
    try {
      const emailData = await supabaseService.executeQuery(supabase =>
        supabase
          .from('customer_email')
          .select('*')
          .eq('customer_id', customerUserData.customer_id)
          .eq('is_primary', true)
          .maybeSingle()
      );
      
      customerEmail = emailData?.email || null;
    } catch {
      // Continue without email data
    }
  }
  
  return {
    id: customerUserData.customer_id,
    name: customerUserData.customers.name,
    phone: customerPhone,
    email: customerEmail
  };
};

/**
 * Perform address search using the customer address
 * @param {Object} address - Customer address object
 * @returns {Object|null} Address search results or null
 */
const performAddressSearch = async (address) => {
  if (!address || !address.city || !address.state) {
    return null;
  }
  
  try {
    // Construct search query from address components
    const searchQuery = `${address.street || ''} ${address.city} ${address.state} ${address.postal_code || ''}`.trim();
    
    // Skip search if query is too short
    if (searchQuery.length < 3) {
      return null;
    }

    
    // Perform address search - this could be replaced with an actual geocoding API call
    // For now, we'll just return the address with a mock geocode result
    const searchResult = {
      ...address,
      query: searchQuery,
      coordinates: {
        latitude: null,
        longitude: null
      },
      formatted_address: `${address.street || ''} ${address.city}, ${address.state} ${address.postal_code || ''}`.trim(),
      search_time: new Date().toISOString()
    };
    
    return searchResult;
  } catch (error) {
    console.error('[Auth] Address search failed:', error.message);
    return null;
  }
};

/**
 * Update user metadata if needed
 * @param {Object} result - Authentication result with user and session
 * @param {Object} profile - User profile
 * @returns {Object|null} Updated session or null
 */
const updateUserMetadataIfNeeded = async (result, profile) => {
  if (!result.user || result.user.user_metadata?.role || !profile?.role) {
    return null;
  }
  
  try {
    const updateData = await supabaseService.executeQuery(supabase =>
      supabase.auth.updateUser({
        data: { role: profile.role }
      })
    );
    
    if (!updateData) {
      return null;
    }
    
    // Refresh session to get updated JWT
    const refreshData = await supabaseService.executeQuery(supabase =>
      supabase.auth.refreshSession()
    );
    
    if (refreshData?.session) {
      return refreshData.session;
    }
  } catch {
    // Continue with original session
  }
  
  return null;
};

/**
 * Sync API keys from local storage to the llm_api_keys table
 * @param {string} userId - The user ID
 * @returns {Promise<void>}
 */
const syncLocalApiKeysToDatabase = async (userId) => {
  try {
    // No longer checking llmSettings from localStorage
    
    // Get all API keys from localStorage
    const providers = ['openAI', 'anthropic', 'google', 'mistral', 'cohere'];
    for (const provider of providers) {
      const keyId = `apiKey_${provider.toLowerCase()}`;
      const apiKey = localStorage.getItem(keyId);
      
      if (apiKey) {
        // Check if this API key already exists in the database
        const existingKey = await supabaseService.executeQuery(supabase =>
          supabase
            .from('llm_api_keys')
            .select('*')
            .eq('user_id', userId)
            .eq('provider', provider)
            .maybeSingle()
        );
        
        if (existingKey) {
          // Update existing key
          await supabaseService.executeQuery(supabase =>
            supabase
              .from('llm_api_keys')
              .update({ api_key: apiKey, updated_at: new Date() })
              .eq('id', existingKey.id)
          );
        } else {
          // Insert new key
          await supabaseService.executeQuery(supabase =>
            supabase
              .from('llm_api_keys')
              .insert({
                user_id: userId,
                provider: provider,
                api_key: apiKey,
                created_at: new Date(),
                updated_at: new Date()
              })
          );
        }
      }
    }
    
    console.log('[Auth] Successfully synced API keys from local storage to database');
  } catch (error) {
    console.error('[Auth] Error syncing API keys to database:', error.message);
    // Continue with login flow even if sync fails
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action) {
      state.session = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      console.log('[Auth] Login successful');
      state.isAuthenticated = true;
      state.loading = false;
      state.user = action.payload.user;
      state.session = action.payload.session;
      state.licenseId = action.payload.user.org_id || null;
      state.error = null;
      state.failedAttempts = 0;
    },
    loginFailure: (state, action) => {
      console.error('[Auth] Login failed:', action.payload);
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
      console.log('[Auth] Logout successful');
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
    },
    updateUserPreferences: (state, action) => {
      if (state.user && state.user.preferences) {
        // Update a specific preference key
        state.user.preferences = {
          ...state.user.preferences,
          [action.payload.key]: action.payload.value
        };
      }
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
        console.log('[Auth] Sign in thunk fulfilled');
        state.isAuthenticated = true;
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.licenseId = action.payload.user.org_id || null;
        state.address = action.payload.address;
        state.error = null;
        state.failedAttempts = 0;
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
        console.error('[Auth] Sign in thunk rejected');
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
        console.log('[Auth] Sign up thunk fulfilled');
        state.isAuthenticated = true;
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.licenseId = action.payload.user.org_id || null;
        state.address = action.payload.address;
        state.error = null;
      })
      .addCase(signUpWithEmail.rejected, (state, action) => {
        console.error('[Auth] Sign up thunk rejected');
        state.loading = false;
        state.error = action.payload || 'Registration failed';
      })
      
      // Sign Out
      .addCase(signOut.fulfilled, () => {
        console.log('[Auth] Sign out thunk fulfilled');
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
          console.log('[Auth] Session restored from getSession');
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.session = action.payload.session;
          state.licenseId = action.payload.user.org_id || null;
        } else {
          console.log('[Auth] No session found in getSession');
        }
      })
      .addCase(getSession.rejected, (state) => {
        console.error('[Auth] Get session thunk rejected');
        state.isRefreshing = false;
        state.isAuthenticated = false;
        state.user = null;
        state.session = null;
      })
      
      // Update Password
      .addCase(updatePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePassword.fulfilled, (state) => {
        console.log('[Auth] Password update thunk fulfilled');
        state.loading = false;
        state.error = null;
      })
      .addCase(updatePassword.rejected, (state, action) => {
        console.error('[Auth] Password update thunk rejected');
        state.loading = false;
        state.error = action.payload || 'Failed to update password';
      })
      
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        console.log('[Auth] Profile update thunk fulfilled');
        state.loading = false;
        state.error = null;
        state.user = action.payload.user;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        console.error('[Auth] Profile update thunk rejected');
        state.loading = false;
        state.error = action.payload || 'Failed to update profile';
      })
      
      // Restore User From Session
      .addCase(restoreUserFromSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreUserFromSession.fulfilled, (state, action) => {
        console.log('[Auth] User state restoration thunk fulfilled');
        state.loading = false;
        state.user = action.payload.user;
        state.address = action.payload.address;
        state.error = null;
      })
      .addCase(restoreUserFromSession.rejected, (state, action) => {
        console.error('[Auth] User state restoration thunk rejected');
        state.loading = false;
        state.error = action.payload || 'Failed to restore user state';
      })
  }
});

export const {
  setSession,
  loginStart,
  loginSuccess,
  loginFailure,
  logoutSuccess,
  clearError,
  checkLockoutExpiry,
  resetFailedAttempts,
  updateUserPreferences
} = authSlice.actions;

/* Removed redundant export of setSession. */

/* Removed redundant export of setSession. */

export const signUpWithEmail = createAsyncThunk(
  'auth/signUpWithEmail',
  async ({ email, password, firstName, lastName, organizationId }, thunkAPI) => {
    console.log('[Auth] Sign up attempt with email');
    try {
      // Create the user in Supabase Auth
      // Sign up with Supabase Auth
      const { data, error } = await supabaseService.executeQuery(supabase =>
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              role: 'user' // Add default role to JWT metadata
            }
          }
        })
      );

      if (error) throw error;
      console.log('[Auth] Sign up successful, creating user profile');

      // Insert user profile into Users table
      const { error: profileError } = await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_profile')
          .insert([
            {
              user_id: data.user.id,
              first_name: firstName,
              last_name: lastName,
              email,
              organization_id: organizationId,
              role: 'user', // Default role
              active_status: 'active'
            }
          ])
      );

      if (profileError) throw profileError;

      // Fetch organization details
      const { data: orgData, error: orgError } = await supabaseService.executeQuery(supabase =>
        supabase
          .from('organizations')
          .select('*')
          .eq('id', organizationId)
          .single()
      );

      if (orgError) throw orgError;

      // Initialize default LLM preferences
      const llmPreferences = {
        defaultProvider: 'openAI',
        preferredStrongModel: '',
        preferredWeakModel: '',
        apiKeyStorage: 'local'
      };
      
      // Save default LLM preferences to user_preferences table
      await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .insert({
            user_id: data.user.id,
            preference_key: 'llm_preferences',
            preference_value: llmPreferences
          })
      );
      
      // Sync API keys to database if needed
      await syncLocalApiKeysToDatabase(data.user.id);

      // Initialize empty preferences, conversations, and functions for new user
      console.log('[Auth] User registration complete');
      
      // Initialize address as null
      let address = null;
      
      return {
        session: data.session,
        user: {
          ...data.user,
          first_name: firstName,
          last_name: lastName,
          org_id: organizationId,
          organization: orgData,
          role: 'user',
          phone: '',
          preferences: {
            llm_preferences: llmPreferences
          },
          customer: null,
          address: address,
          conversations: [],
          functions: []
        },
        address: address
      };
    } catch (error) {
      console.error('[Auth] Sign up failed:', error.message);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, thunkAPI) => {
    console.log('[Auth] Sign out attempt');
    try {
      // Get current user ID and preferences
      const state = thunkAPI.getState();
      const userId = state.auth.user?.id;
      const preferences = state.auth.user?.preferences || {};
      
      // Check if we need to delete API keys based on preferences
      const llmStorage = preferences.llm_storage;
      if (userId && llmStorage && llmStorage.apiKeyStorage !== 'saved') {
        console.log('[Auth] Deleting API keys from database as per user preferences');
        try {
          // Delete all API keys for this user
          await supabaseService.executeQuery(supabase =>
            supabase
              .from('llm_api_keys')
              .delete()
              .eq('user_id', userId)
          );
          console.log('[Auth] Successfully deleted API keys from database');
        } catch (deleteError) {
          console.error('[Auth] Error deleting API keys:', deleteError.message);
          // Continue with logout even if deletion fails
        }
      }
      
      // Proceed with sign out
      const result = await supabaseService.executeQuery(supabase =>
        supabase.auth.signOut()
      );
      if (result && result.error) throw result.error;
      console.log('[Auth] Sign out successful');
      return null;
    } catch (error) {
      console.error('[Auth] Sign out failed:', error.message);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const getSession = createAsyncThunk(
  'auth/getSession',
  async (_, thunkAPI) => {
    console.log('[Auth] Getting current session');
    try {
      // Get current session from Supabase
      const { data, error } = await supabaseService.executeQuery(supabase =>
        supabase.auth.getSession()
      );

      if (error) throw error;
      if (!data.session) {
        console.log('[Auth] No active session found');
        return null;
      }
      console.log('[Auth] Active session found, loading user data');

      // Fetch user profile from Users table - try a simpler query first
      console.log('[Auth] Fetching user profile for user ID:', data.session.user.id);
      
      // First try to get the user profile without any joins
      let { data: profileData, error: profileError } = await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_profile')
          .select('*')
          .eq('user_id', data.session.user.id)
          .maybeSingle()
      );

      console.log('[Auth] User profile query response:', {
        success: !profileError,
        userId: data.session.user.id,
        profileData, // Include the full profile data
        error: profileError ? profileError.message : null
      });

      // User profile is required, so still throw an error if not found
      if (profileError) throw profileError;
      
      // If no profile data was found, try an alternative approach
      if (!profileData) {
        console.log('[Auth] User profile not found with user_id, trying with id');
        
        // Try to find the profile using the auth user's id directly
        const { data: altProfileData, error: altProfileError } = await supabaseService.executeQuery(supabase =>
          supabase
            .from('user_profile')
            .select('*')
            .eq('id', data.session.user.id)
            .maybeSingle()
        );
          
        if (altProfileError) throw altProfileError;
        
        if (!altProfileData) {
          console.log('[Auth] User profile not found with either user_id or id');
          throw new Error('User profile not found. Please contact support.');
        }
        
        console.log('[Auth] Found user profile using id instead of user_id');
        profileData = altProfileData;
      }
      
      // Now fetch organization data separately if needed
      let organizationData = null;
      if (profileData.organization_id) {
        const { data: orgData } = await supabaseService.executeQuery(supabase =>
          supabase
            .from('organizations')
            .select('*')
            .eq('id', profileData.organization_id)
            .maybeSingle()
        );
          
        organizationData = orgData;
      }

      // Fetch user preferences
      const { data: preferencesData } = await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', data.session.user.id)
      );

      // Don't throw on preferences error, just use empty preferences
      const preferences = preferencesData ? preferencesData.reduce((acc, pref) => {
        acc[pref.preference_key] = pref.preference_value;
        return acc;
      }, {}) : {};
      
      // No longer syncing with localStorage
      // Removed unused variable
      
      // Check if llm_storage preference exists with apiKeyStorage set to 'local'
      const llmStorage = preferences.llm_storage;
      if (llmStorage && llmStorage.apiKeyStorage === 'local') {
        // Get API keys from local storage and store them in llm_api_keys table
        await syncLocalApiKeysToDatabase(data.session.user.id);
      }

      // Fetch customer information if available
      let customerUserData = null;
      try {
        // First try with profileData.id
        const { data: userData } = await supabaseService.executeQuery(supabase =>
          supabase
            .from('customer_user')
            .select('*, customers(*)')
            .eq('user_id', profileData.id)
            .maybeSingle()
        );
        
        if (userData) {
          customerUserData = userData;
          console.log('[Auth] Found customer user data using profileData.id');
        } else {
          // Try with user_id from auth
          const { data: altUserData } = await supabaseService.executeQuery(supabase =>
            supabase
              .from('customer_user')
              .select('*, customers(*)')
              .eq('user_id', data.session.user.id)
              .maybeSingle()
          );
          
          if (altUserData) {
            customerUserData = altUserData;
            console.log('[Auth] Found customer user data using session.user.id');
          } else {
            console.log('[Auth] No customer user data found for this user');
          }
        }
      } catch (customerError) {
        console.error('[Auth] Error fetching customer data:', customerError.message);
      }

      // We don't throw on customer errors because the user might not be associated with a customer

      // Fetch customer phone if customer exists
      let customerPhone = null;
      let customerAddress = null;
      let addressSearchResult = null;
      if (customerUserData && customerUserData.customer_id) {
        try {
          const { data: phoneData } = await supabaseService.executeQuery(supabase =>
            supabase
              .from('customer_phone')
              .select('*')
              .eq('customer_id', customerUserData.customer_id)
              .eq('is_primary', true)
              .maybeSingle()
          );
          
          customerPhone = phoneData?.phone || null;
          console.log('[Auth] Customer phone data:', phoneData ? 'found' : 'not found');
          
          // Fetch customer address
          const { data: addressData } = await supabaseService.executeQuery(supabase =>
            supabase
              .from('customer_address')
              .select('*')
              .eq('customer_id', customerUserData.customer_id)
              .maybeSingle()
          );
          
          customerAddress = addressData;
          console.log('[Auth] Customer address data:', addressData ? 'found' : 'not found');
          
          // Perform address search if address exists
          if (customerAddress) {
            addressSearchResult = await performAddressSearch(customerAddress);
          }
        } catch (error) {
          console.error('[Auth] Error fetching customer data:', error.message);
        }
      }

      // Fetch customer email if customer exists
      let customerEmail = null;
      if (customerUserData && customerUserData.customer_id) {
        try {
          const { data: emailData } = await supabaseService.executeQuery(supabase =>
            supabase
              .from('customer_email')
              .select('*')
              .eq('customer_id', customerUserData.customer_id)
              .eq('is_primary', true)
              .maybeSingle()
          );
          
          customerEmail = emailData;
          console.log('[Auth] Customer email data:', emailData ? 'found' : 'not found');
        } catch (emailError) {
          console.error('[Auth] Error fetching customer email:', emailError.message);
        }
      }

      // Fetch user's conversations
      const { data: conversationsData } = await supabaseService.executeQuery(supabase =>
        supabase
          .from('conversations')
          .select('*')
          .eq('user_id', data.session.user.id)
      );

      // Don't throw on conversations error, just use empty array

      // Fetch user's functions
      const { data: functionsData } = await supabaseService.executeQuery(supabase =>
        supabase
          .from('functions')
          .select('*')
          .eq('user_id', data.session.user.id)
      );

      // Don't throw on functions error, just use empty array

      console.log('[Auth] Session restored successfully');
      return {
        session: data.session,
        user: {
          ...data.session.user,
          ...profileData,
          org_id: profileData.organization_id,
          organization: organizationData,
          preferences,
          phone: customerPhone,
          customer: customerUserData && customerUserData.customers ? {
            id: customerUserData.customer_id,
            name: customerUserData.customers.name,
            email: customerEmail
          } : null,
          address: addressSearchResult,
          conversations: conversationsData || [],
          functions: functionsData || []
        },
        address: addressSearchResult
      };
    } catch (error) {
      console.error('[Auth] Session restoration failed:', error.message);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const updatePassword = createAsyncThunk(
  'auth/updatePassword',
  async ({ currentPassword, newPassword }, thunkAPI) => {
    console.log('[Auth] Password update attempt');
    try {
      // Check if we should mock auth in development
      const isDevelopment = import.meta.env.VITE_ENVIRONMENT === 'Development';
      const shouldMockAuth = isDevelopment &&
                            (import.meta.env.VITE_AD_AUTH_MOCK === 'true' ||
                             import.meta.env.VITE_AD_AUTH_MOCK === true);
      
      if (shouldMockAuth) {
        // Mock successful password update
        return { success: true, message: 'Password updated successfully (mocked)' };
      }
      
      // Real implementation using Supabase
      const { error } = await supabaseService.executeQuery(supabase =>
        supabase.auth.updateUser({
          password: newPassword,
          currentPassword: currentPassword
        })
      );
      
      if (error) throw error;
      
      console.log('[Auth] Password updated successfully');
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('[Auth] Password update failed:', error.message);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, thunkAPI) => {
    console.log('[Auth] Profile update attempt');
    try {
      // Check if we should mock auth in development
      const isDevelopment = import.meta.env.VITE_ENVIRONMENT === 'Development';
      const shouldMockAuth = isDevelopment &&
                            (import.meta.env.VITE_AD_AUTH_MOCK === 'true' ||
                             import.meta.env.VITE_AD_AUTH_MOCK === true);
      
      if (shouldMockAuth) {
        // Mock successful profile update
        return {
          success: true,
          message: 'Profile updated successfully (mocked)',
          user: {
            ...thunkAPI.getState().auth.user,
            ...profileData
          }
        };
      }
      
      // Get current user ID
      const userId = thunkAPI.getState().auth.user?.id;
      if (!userId) throw new Error('User not authenticated');
      
      // Update user metadata in Supabase Auth
      const { error: authError } = await supabaseService.executeQuery(supabase =>
        supabase.auth.updateUser({
          data: {
            first_name: profileData.first_name,
            last_name: profileData.last_name
          }
        })
      );
      
      if (authError) throw authError;
      
      // Update user profile in Users table
      const { error: profileError } = await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_profile')
          .update({
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            phone: profileData.phone,
            location: profileData.location
          })
          .eq('user_id', userId)
      );
      
      if (profileError) throw profileError;
      
      // Fetch updated user profile
      const { data: updatedProfile, error: fetchError } = await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_profile')
          .select('*')
          .eq('user_id', userId)
          .single()
      );
      
      if (fetchError) throw fetchError;
      
      console.log('[Auth] Profile updated successfully');
      return {
        success: true,
        message: 'Profile updated successfully',
        user: {
          ...thunkAPI.getState().auth.user,
          ...updatedProfile
        }
      };
    } catch (error) {
      console.error('[Auth] Profile update failed:', error.message);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

// Export the restoreUserFromSession thunk
export const restoreUserFromSession = createAsyncThunk(
  'auth/restoreUserFromSession',
  async (_, thunkAPI) => {
    console.log('[Auth] Restoring user state from session');
    try {
      // Get current session from Redux state
      const state = thunkAPI.getState();
      const session = state.auth.session;
      
      if (!session) {
        console.log('[Auth] No session found, cannot restore user state');
        return thunkAPI.rejectWithValue('No active session');
      }
      
      // Use the existing fetchUserData function to get user data
      const userData = await fetchUserData({ user: session.user, session });
      
      console.log('[Auth] User state restored successfully');
      return {
        session,
        user: {
          ...session.user,
          ...userData.profile,
          org_id: userData.profile?.organization_id || null,
          organization: userData.organization,
          preferences: userData.preferences,
          phone: userData.customer?.phone || '',
          customer: userData.customer ? {
            id: userData.customer.id,
            name: userData.customer.name,
            email: userData.customer.email
          } : null,
          address: userData.address,
          conversations: userData.conversations || [],
          functions: userData.functions || []
        },
        address: userData.address
      };
    } catch (error) {
      console.error('[Auth] User state restoration failed:', error.message);
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export default authSlice.reducer;
