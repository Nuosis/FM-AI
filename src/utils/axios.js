import axios from 'axios';
import { store } from '../redux/store';
import { 
  logoutSuccess,
  refreshTokenStart,
  refreshTokenSuccess,
  refreshTokenFailure
} from '../redux/slices/authSlice';

// Create axios instance with base URL from environment variables
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
});

// Add request interceptor
instance.interceptors.request.use(
  (config) => {
    // Get access token from Redux store
    const accessToken = store.getState().auth.accessToken;
    
    // Add Authorization header if token exists
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle auth errors (401 Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Get refresh token from store
        const refreshToken = store.getState().auth.refreshToken;
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Dispatch refresh token start
        store.dispatch(refreshTokenStart());

        // Create a clean axios instance for refresh token request
        const refreshAxios = axios.create({
          baseURL: import.meta.env.VITE_API_BASE_URL,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Attempt to refresh token with clean instance
        const response = await refreshAxios.post('/api/auth/refresh', {
          refresh_token: refreshToken
        });

        // Structure the response data for the store
        const refreshData = {
          access_token: response.data.access_token,
          user: {
            ...store.getState().auth.user,
            modules: response.data.modules
          }
        };

        // Update tokens in store
        store.dispatch(refreshTokenSuccess(refreshData));

        // Update Authorization header
        originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
        
        // Retry original request
        return instance(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        store.dispatch(refreshTokenFailure(refreshError.message));
        store.dispatch(logoutSuccess());
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
