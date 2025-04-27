import axios from 'axios';
import supabase from '../utils/supabase';
import { createLog, LogType } from '../redux/slices/appSlice';
import store from '../redux/store';

/**
 * Unified API Client Service
 * 
 * This service provides a centralized way to make API calls throughout the application.
 * It handles authentication, error handling, and logging consistently.
 */

// Create base axios instance with interceptors
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 60000 // 1 minute timeout
});

// Add auth interceptor
axiosInstance.interceptors.request.use(async (config) => {
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
});

// Add response interceptor for logging
axiosInstance.interceptors.response.use(
  response => {
    logApiCall('success', response.config.url, response.status, response.data);
    return response;
  },
  error => {
    logApiCall('error', error.config?.url, error.response?.status, error.message);
    return Promise.reject(error);
  }
);

// Logging helper
function logApiCall(type, url, status, data) {
  const message = `API ${type}: ${url} (${status})`;
  console.log(message, data);
  store.dispatch(createLog(message, type === 'error' ? LogType.ERROR : LogType.INFO));
}

/**
 * API Service for making consistent API calls throughout the application
 */
const apiService = {
  // Standard REST methods
  async get(url, options = {}) {
    return axiosInstance.get(url, options);
  },
  
  async post(url, data, options = {}) {
    return axiosInstance.post(url, data, options);
  },
  
  async put(url, data, options = {}) {
    return axiosInstance.put(url, data, options);
  },
  
  async delete(url, options = {}) {
    return axiosInstance.delete(url, options);
  },
  
  // File upload with progress
  async uploadFile(url, formData, onProgress) {
    return axiosInstance.post(url, formData, {
      onUploadProgress: progressEvent => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
  },
  
  // Edge function calls
  async callEdgeFunction(functionName, body) {
    try {
      const { data: authData } = await supabase.auth.getSession();
      const token = authData?.session?.access_token;
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (error) throw error;
      
      // Parse the response if it's a string
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      console.error(`Edge function error (${functionName}):`, error);
      throw error;
    }
  },
  
  // LLM provider calls
  async callLLMProvider(provider, type, model, data, options = {}) {
    try {
      const response = await fetch('http://localhost:3500/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': await this.getAuthHeader()
        },
        body: JSON.stringify({
          provider: provider.toLowerCase(),
          type,
          model,
          ...data,
          options
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error(`LLM proxy error (${provider}/${type}):`, error);
      throw error;
    }
  },
  
  // Helper method to get auth header
  async getAuthHeader() {
    const { data: authData } = await supabase.auth.getSession();
    const token = authData?.session?.access_token;
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    return `Bearer ${token}`;
  },
  
  // Local service calls (proxy server)
  async callLocalService(endpoint, data) {
    try {
      const response = await fetch(`http://localhost:3500${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Local service error: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error(`Local service error (${endpoint}):`, error);
      throw error;
    }
  },
  
  // Helper function to create requests that can suppress error handling
  createRequest(config, suppressErrors = false) {
    return {
      ...config,
      timeout: 60000,
      validateStatus: suppressErrors 
        ? () => true
        : (status) => status >= 200 && status < 300
    };
  },
  
  // Helper function to make a request that returns response data even for error status codes
  async makeRequestReturnError(config) {
    try {
      const response = await axiosInstance(this.createRequest(config, true));
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
  }
};

export default apiService;