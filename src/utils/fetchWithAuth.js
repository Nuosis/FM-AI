/**
 * Utility function to make fetch requests with authentication
 * 
 * This function:
 * 1. Gets the JWT token from Supabase
 * 2. Adds the Authorization header to the request
 * 3. Makes the fetch request
 * 
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise} - The fetch promise
 */

import supabase from './supabase';

export const fetchWithAuth = async (url, options = {}) => {
  try {
    // Get the current session from Supabase
    const { data: authData } = await supabase.auth.getSession();
    const token = authData?.session?.access_token;
    
    // Create headers with Authorization if token exists
    const headers = {
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Make the fetch request with the Authorization header
    return fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error('Error adding auth token to fetch request:', error);
    // Continue with the fetch request without the token
    return fetch(url, options);
  }
};

export default fetchWithAuth;