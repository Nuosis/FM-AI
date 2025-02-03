import axios from 'axios';

// Create axios instance with base URL and credentials config
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true
});

// Add request interceptor
instance.interceptors.request.use(
  (config) => {
    // Debug: Log request URL
    console.log(`Request to ${config.url}`);
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
    // Handle auth errors (403, 500 [but not 401 - not found])
    if (error.response?.status === 403) {
      // TODO: IMPLEMENT ERROR in snack bar
    }
    return Promise.reject(error);
  }
);

export default instance;
