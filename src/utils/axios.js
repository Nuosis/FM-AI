import axios from 'axios';
import { store } from '../redux/store';
import { createLog } from '../redux/slices/appSlice';
import {
  refreshStart,
  refreshSuccess,
  refreshFailure,
  logoutSuccess
} from '../redux/slices/authSlice';

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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Function to check if token needs refresh
const shouldRefreshToken = () => {
  const state = store.getState().auth;
  if (!state.tokenExpiry) return false;
  
  // Refresh if token expires in less than 1 minute
  const expiryTime = new Date(state.tokenExpiry).getTime();
  const currentTime = Date.now();
  return (expiryTime - currentTime) < 60000;
};

// Function to refresh token
const refreshToken = async () => {
  try {
    store.dispatch(refreshStart());
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    
    // New response format has access_token in body
    const { access_token } = response.data;
    store.dispatch(refreshSuccess({
      accessToken: access_token,
      // Token expiry can be extracted from JWT if needed
      tokenExpiry: new Date(Date.now() + 15 * 60 * 1000).toISOString() // Default 15min
    }));
    return access_token;
  } catch (error) {
    store.dispatch(refreshFailure());
    store.dispatch(logoutSuccess());
    throw error;
  }
};

// Add request interceptor for authentication and logging
instance.interceptors.request.use(
  async (config) => {
    store.dispatch(createLog(`API Request: ${config.method?.toUpperCase()} ${config.url}`, 'debug'));
    
    const state = store.getState().auth;
    const originalRequest = config;

    // Skip header modifications for auth endpoints
    if (config.url?.includes('/auth/')) {
      // Don't add org ID header for login endpoint
      if (!config.url.endsWith('/auth/login')) {
        originalRequest.headers['X-Organization-Id'] = import.meta.env.VITE_PUBLIC_KEY;
      }
      // Skip token handling for non-refresh auth endpoints
      if (!config.url.includes('/auth/refresh')) {
        return config;
      }
    } else {
      // Add organization ID header for non-auth requests
      originalRequest.headers['X-Organization-Id'] = import.meta.env.VITE_PUBLIC_KEY;
    }

    if (state.accessToken) {
      // Check if token needs refresh
      if (shouldRefreshToken()) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newToken = await refreshToken();
            isRefreshing = false;
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          } catch (error) {
            isRefreshing = false;
            processQueue(error, null);
            throw error;
          }
        } else {
          // Add request to queue if refresh is in progress
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return originalRequest;
          }).catch(err => {
            return Promise.reject(err);
          });
        }
      } else {
        // Add token to request header
        originalRequest.headers.Authorization = `Bearer ${state.accessToken}`;
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
    if (status === 403 && config.url?.includes('/auth/login')) {
      store.dispatch(createLog('Login failed - Invalid credentials or missing organization ID', 'error'));
      return Promise.reject(new Error('Invalid credentials or missing organization ID'));
    }
    
    if (status === 401 && !config.url?.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refreshToken();
          isRefreshing = false;
          processQueue(null, newToken);
          config.headers.Authorization = `Bearer ${newToken}`;
          return instance(config);
        } catch (refreshError) {
          isRefreshing = false;
          processQueue(refreshError, null);
          return Promise.reject(refreshError);
        }
      } else {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          config.headers.Authorization = `Bearer ${token}`;
          return instance(config);
        }).catch(err => {
          return Promise.reject(err);
        });
      }
    }
    
    store.dispatch(createLog(`API Response Error: ${status} - ${message}`, 'error'));
    store.dispatch(createLog(`Failed Request Details: ${config.method?.toUpperCase()} ${config.url}`, 'error'));
    store.dispatch(createLog(`Response Headers: ${JSON.stringify(error.response?.headers)}`, 'debug'));
    
    return Promise.reject(error);
  }
);

export default instance;
