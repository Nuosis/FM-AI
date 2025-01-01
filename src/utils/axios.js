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

        // Attempt to refresh token
        const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken
        });

        // Update tokens in store
        store.dispatch(refreshTokenSuccess(response.data));

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
