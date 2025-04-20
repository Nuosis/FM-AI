/**
 * Utility functions for API key storage management
 */

// Storage types
export const API_STORAGE_TYPES = {
  SESSION: 'session',
  LOCAL: 'local',
  SAVED: 'saved'
};

/**
 * Store API key based on storage preference
 * @param {string} provider - The provider name
 * @param {string} apiKey - The API key to store
 * @param {string} storageType - The storage type (session, local, saved)
 * @param {boolean} isMockMode - Whether we're in mock mode
 */
export const storeApiKey = (provider, apiKey, storageType, isMockMode = false) => {
  if (isMockMode) {
    console.log(`[MOCK] Storing API key for ${provider} in ${storageType} storage`);
    return;
  }

  const keyId = `apiKey_${provider.toLowerCase()}`;

  switch (storageType) {
    case API_STORAGE_TYPES.SESSION:
      // Store in session storage (cleared when browser is closed)
      sessionStorage.setItem(keyId, apiKey);
      // Ensure it's removed from other storage types
      localStorage.removeItem(keyId);
      // In a real app, we would also remove from backend storage here
      break;
    
    case API_STORAGE_TYPES.LOCAL:
      // Store in local storage (persists across browser sessions)
      localStorage.setItem(keyId, apiKey);
      sessionStorage.removeItem(keyId);
      // In a real app, we would also remove from backend storage here
      break;
    
    case API_STORAGE_TYPES.SAVED:
      // Store in both local storage and potentially backend
      localStorage.setItem(keyId, apiKey);
      sessionStorage.removeItem(keyId);
      // In a real app, we would also store in backend here
      // This is where we would make an API call to store the key securely
      break;
    
    default:
      console.error(`Unknown storage type: ${storageType}`);
  }
};

/**
 * Retrieve API key based on storage preference
 * @param {string} provider - The provider name
 * @param {string} storageType - The storage type (session, local, saved)
 * @param {boolean} isMockMode - Whether we're in mock mode
 * @returns {string|null} The API key or null if not found
 */
export const getApiKey = (provider, storageType, isMockMode = false) => {
  if (isMockMode) {
    console.log(`[MOCK] Getting API key for ${provider} from ${storageType} storage`);
    return 'mock-api-key-12345';
  }

  const keyId = `apiKey_${provider.toLowerCase()}`;
  
  switch (storageType) {
    case API_STORAGE_TYPES.SESSION:
      return sessionStorage.getItem(keyId);
    
    case API_STORAGE_TYPES.LOCAL:
      return localStorage.getItem(keyId);
    
    case API_STORAGE_TYPES.SAVED: {
      // Try local storage first
      const localKey = localStorage.getItem(keyId);
      if (localKey) return localKey;
      
      // In a real app, we would also try to get from backend here
      return null;
    }
    
    default:
      console.error(`Unknown storage type: ${storageType}`);
      return null;
  }
};

/**
 * Delete API key from all storage locations
 * @param {string} provider - The provider name
 * @param {boolean} isMockMode - Whether we're in mock mode
 */
export const deleteApiKey = (provider, isMockMode = false) => {
  if (isMockMode) {
    console.log(`[MOCK] Deleting API key for ${provider} from all storage`);
    return;
  }

  const keyId = `apiKey_${provider.toLowerCase()}`;
  
  // Remove from all client-side storage
  localStorage.removeItem(keyId);
  sessionStorage.removeItem(keyId);
  
  // In a real app, we would also remove from backend storage here
};