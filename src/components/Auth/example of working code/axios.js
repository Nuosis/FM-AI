import axios from 'axios';
import { store } from '../store/index.js';
import { showError } from '../store/slices/errorSlice.js';
import { createLog } from '../store/slices/logSlice.js';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 60000 // 1 minute timeout
});

// Helper function to create requests that can suppress error handling
export const createRequest = (config, suppressErrors = false) => {
  return {
    ...config,
    timeout: 60000, // 1 minute timeout for custom requests too
    validateStatus: suppressErrors 
      ? () => true // Accept all status codes without throwing errors
      : (status) => status >= 200 && status < 300 // Default axios validation
  };
};

// Add request interceptor for logging
instance.interceptors.request.use(
  (config) => {
    store.dispatch(createLog(`API Request: ${config.method?.toUpperCase()} ${config.url}`, 'debug'));
    store.dispatch(createLog(`Request Headers: ${JSON.stringify(config.headers)}`, 'debug'));
    return config;
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
      store.dispatch(showError('Request timed out. Please try again.'));
      return Promise.reject(new Error('Request timed out after 1 minute'));
    }

    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    const config = error.config;
    
    store.dispatch(createLog(`API Response Error: ${status} - ${message}`, 'error'));
    store.dispatch(createLog(`Failed Request Details: ${config.method?.toUpperCase()} ${config.url}`, 'error'));
    store.dispatch(createLog(`Response Headers: ${JSON.stringify(error.response?.headers)}`, 'debug'));
    
    // Show error in snackbar
    if (status === 403) {
      store.dispatch(showError(message)); // Just show the message for 403s
    } else {
      store.dispatch(showError(`Error ${status}: ${message}`));
    }
    
    return Promise.reject(error);
  }
);

export default instance;
