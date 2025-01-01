import axios from 'axios';
import { store } from '../redux/store';
import { logoutSuccess } from '../redux/slices/authSlice';

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
  (error) => {
    // Handle auth errors (401 Unauthorized)
    if (error.response?.status === 401) {
      // Redirect to login or refresh token
      console.error('Authentication error:', error);
      store.dispatch(logoutSuccess());
    }
    return Promise.reject(error);
  }
);

export default instance;
