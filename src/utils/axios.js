import axios from 'axios';
import supabase from './supabase';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 60000 // 1 minute timeout
});

// Add a request interceptor to include JWT token in all requests
instance.interceptors.request.use(
  async (config) => {
    try {
      // Get the current session from Supabase
      const { data: authData } = await supabase.auth.getSession();
      const token = authData?.session?.access_token;
      
      // If token exists, add it to the Authorization header
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    } catch (error) {
      console.error('Error adding auth token to request:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

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

    
export default instance;
