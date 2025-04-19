import axios from 'axios';
import { store } from '../redux/store';
import { createLog } from '../redux/slices/appSlice';
import { getSession, signOut } from '../redux/slices/authSlice';
import supabase from './supabase';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 60000 // 1 minute timeout
});

// Helper function to create requests that can suppress error handling
export const createRequest = (config, suppressErrors = false) => {
  return {
    ...config,
    timeout: 60000,
    validateStatus: suppressErrors 
      ? () => true
      : (status) => status >= 200 && status < 300
  };
};

// Helper function to make a request that returns response data even for error status codes
export const makeRequestReturnError = async (config) => {
  try {
    const response = await instance(createRequest(config, true));
    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
      error: null,
      isError: response.status >= 400
    };
  } catch (error) {
    // Handle network errors or other non-HTTP errors
    return {
      data: null,
      status: error.response?.status || 0,
      headers: error.response?.headers || {},
      error: error.message,
      isError: true
    };
  }
};

// Function to get current Supabase session
const getSupabaseSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  } catch (error) {
    store.dispatch(createLog(`Failed to get Supabase session: ${error.message}`, 'error'));
    return null;
  }
};

// Function to refresh Supabase session if needed
const refreshSupabaseSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  } catch (error) {
    store.dispatch(createLog(`Failed to refresh Supabase session: ${error.message}`, 'error'));
    store.dispatch(signOut());
    throw error;
  }
};

// Add request interceptor for authentication and logging
instance.interceptors.request.use(
  async (config) => {
    store.dispatch(createLog(`API Request: ${config.method?.toUpperCase()} ${config.url}`, 'debug'));
    
    const state = store.getState().auth;
    const originalRequest = config;

    // Add organization ID header for all requests
    originalRequest.headers['X-Organization-Id'] = import.meta.env.VITE_PUBLIC_KEY;

    // Add Supabase session token if authenticated
    if (state.isAuthenticated && state.session) {
      originalRequest.headers.Authorization = `Bearer ${state.session.access_token}`;
    } else {
      // Try to get current session
      const session = await getSupabaseSession();
      if (session) {
        // Update Redux state with current session
        store.dispatch(getSession());
        originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
      }
    }

    store.dispatch(createLog(`Request Headers: ${JSON.stringify(originalRequest.headers)}`, 'debug'));
    return originalRequest;
  },
  (error) => {
    store.dispatch(createLog(`Request Error: ${error.message}`, 'error'));
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
instance.interceptors.response.use(
  (response) => {
    store.dispatch(createLog(`API Response Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, 'debug'));
    return response;
  },
  async (error) => {
    // Handle timeout error specifically
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      store.dispatch(createLog('Request timed out after 1 minute', 'error'));
      return Promise.reject(new Error('Request timed out after 1 minute'));
    }

    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    const config = error.config;
    
    // Log detailed error information
    store.dispatch(createLog(`API Error Details:
Status: ${status}
URL: ${config.method?.toUpperCase()} ${config.url}
Message: ${message}
Request Headers: ${JSON.stringify(config.headers)}
Response Data: ${JSON.stringify(error.response?.data)}`, 'error'));

    // Handle authentication errors
    if (status === 401) {
      try {
        // Try to refresh the session
        const session = await refreshSupabaseSession();
        if (session) {
          // Update the request with the new token and retry
          config.headers.Authorization = `Bearer ${session.access_token}`;
          return instance(config);
        } else {
          // If refresh fails, sign out
          store.dispatch(signOut());
          return Promise.reject(new Error('Authentication failed. Please sign in again.'));
        }
      } catch (refreshError) {
        // If refresh fails, sign out
        store.dispatch(signOut());
        return Promise.reject(refreshError);
      }
    }
    
    store.dispatch(createLog(`API Response Error: ${status} - ${message}`, 'error'));
    store.dispatch(createLog(`Failed Request Details: ${config.method?.toUpperCase()} ${config.url}`, 'error'));
    store.dispatch(createLog(`Response Headers: ${JSON.stringify(error.response?.headers)}`, 'debug'));
    
    return Promise.reject(error);
  }
);

export default instance;
