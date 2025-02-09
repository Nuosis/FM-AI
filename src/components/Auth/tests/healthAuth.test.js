import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import dotenv from 'dotenv';
import process from 'process';

// Load environment variables from frontend/.env
const result = dotenv.config({ path: process.cwd() + '/.env' });
if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

// Define log types
const LogType = {
  INFO: 'info',
  WARNING: 'warning',
  DEBUG: 'debug',
  ERROR: 'error'
};

// Test configuration and logging setup
const log = (message, type = LogType.INFO) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
};

const API_BASE_URL = process.env.VITE_API_BASE_URL;
const TEST_USER = process.env.TEST_USER;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!API_BASE_URL) {
  throw new Error('Required environment variables are not set');
}
if (!TEST_USER || !TEST_PASSWORD) {
  throw new Error('Required environment (TEST_USER/PASSWORD) variables are not set');
}

let accessToken = null;
let tokenExpiry = null;

// Helper function for fetch options with Bearer token
const getFetchOptions = (method = 'GET', headers = {}, body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  // Add Bearer token if available
  if (accessToken) {
    options.headers.Authorization = `Bearer ${accessToken}`;
  }
  
  return options;
};

// Helper function to check if token needs refresh
const shouldRefreshToken = () => {
  if (!tokenExpiry) return false;
  const expiryTime = new Date(tokenExpiry).getTime();
  const currentTime = Date.now();
  return (expiryTime - currentTime) < 60000; // Less than 1 minute until expiry
};

// Helper function to refresh token
const refreshToken = async () => {
  try {
    log('Refreshing access token...', LogType.INFO);
    
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, getFetchOptions('POST'));
    
    if (!response.ok) {
      throw new Error(`Token refresh failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    accessToken = data.accessToken;
    tokenExpiry = data.tokenExpiry;
    
    log('Token refresh successful', LogType.INFO);
    return true;
  } catch (error) {
    log(`Token refresh failed: ${error.message}`, LogType.ERROR);
    return false;
  }
};

// Test unprotected /health endpoint
export async function testHealth() {
  try {
    log('Testing unprotected /health endpoint...', LogType.INFO);
    
    const response = await fetch(`${API_BASE_URL}/health`, getFetchOptions());

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.status || data.status !== 'healthy') {
      throw new Error('Invalid response from health endpoint');
    }

    log('Health test passed', LogType.INFO);
    return true;
  } catch (error) {
    log(`Health test failed: ${error.message}`, LogType.ERROR);
    return false;
  }
}

// Test /health/token with Bearer token
export async function testHealthSecureToken() {
  try {
    log('Testing /api/auth/health/token with Bearer token...', LogType.INFO);
    
    // Check if token needs refresh
    if (shouldRefreshToken()) {
      if (!await refreshToken()) {
        throw new Error('Token refresh failed before health check');
      }
    }
    
    const response = await fetch(`${API_BASE_URL}/api/auth/health/token`, getFetchOptions());

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.status || data.status !== 'healthy' || data.auth !== 'token') {
      throw new Error('Invalid response from health/token endpoint');
    }

    log('Auth health token test passed', LogType.INFO);
    return true;
  } catch (error) {
    log(`Auth health token test failed: ${error.message}`, LogType.ERROR);
    return false;
  }
}

// Test token refresh flow
export async function testTokenRefresh() {
  try {
    log('Testing token refresh flow...', LogType.INFO);
    
    // Force token expiry
    tokenExpiry = new Date(Date.now() + 30000).toISOString(); // 30 seconds from now
    
    // Attempt a request that should trigger refresh
    const response = await fetch(`${API_BASE_URL}/api/auth/health/token`, getFetchOptions());
    
    if (!response.ok) {
      throw new Error('Request failed after token refresh');
    }
    
    // Verify we got a new token
    if (!accessToken || !tokenExpiry) {
      throw new Error('Token refresh did not update credentials');
    }
    
    log('Token refresh flow test passed', LogType.INFO);
    return true;
  } catch (error) {
    log(`Token refresh flow test failed: ${error.message}`, LogType.ERROR);
    return false;
  }
}

// Test token cleanup
export async function testTokenCleanup() {
  try {
    log('Testing token cleanup...', LogType.INFO);
    
    // Perform logout
    const logoutResponse = await fetch(`${API_BASE_URL}/api/auth/logout`, getFetchOptions('POST'));
    
    if (!logoutResponse.ok) {
      throw new Error('Logout request failed');
    }
    
    // Clear tokens
    accessToken = null;
    tokenExpiry = null;
    
    // Verify protected endpoint fails
    const healthResponse = await fetch(`${API_BASE_URL}/api/auth/health/token`, getFetchOptions());
    
    if (healthResponse.ok) {
      throw new Error('Protected endpoint still accessible after logout');
    }
    
    log('Token cleanup test passed', LogType.INFO);
    return true;
  } catch (error) {
    log(`Token cleanup test failed: ${error.message}`, LogType.ERROR);
    return false;
  }
}

// Login to establish session
export async function login() {
  try {
    log('Logging in to establish session...', LogType.INFO);
    
    const credentials = Buffer.from(`${TEST_USER}:${TEST_PASSWORD}`).toString('base64');
    
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify({ org_id: process.env.VITE_PUBLIC_KEY })
    });

    if (!response.ok) {
      throw new Error(`Login failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Log the complete response data
    log('Login response data:', LogType.DEBUG);
    log(JSON.stringify(data, null, 2), LogType.DEBUG);
    
    // Store token information from response
    if (data.access_token) {
      accessToken = data.access_token;
      
      // Extract expiry from JWT token
      try {
        const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
        tokenExpiry = new Date(payload.exp * 1000).toISOString();
      } catch (error) {
        log('Failed to parse token expiry', LogType.ERROR);
        throw new Error('Invalid token format');
      }
    }
    
    if (!accessToken || !tokenExpiry) {
      throw new Error('Login response missing token data');
    }
    
    log('Login successful with access token', LogType.INFO);
    return data.user;
  } catch (error) {
    log(`Login failed: ${error.message}`, LogType.ERROR);
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  log('\n=== Starting Health Endpoint Tests ===\n', LogType.INFO);

  // Test unprotected endpoints
  if (!await testHealth()) {
    log('Unprotected health test failed, stopping tests', LogType.ERROR);
    return false;
  }
  
  // Login to establish session
  try {
    await login();
  } catch {
    log('Failed to establish session, stopping tests', LogType.ERROR);
    return false;
  }

  // Test token auth
  if (!await testHealthSecureToken()) {
    log('Auth health token test failed', LogType.ERROR);
    return false;
  }

  // Test token refresh
  if (!await testTokenRefresh()) {
    log('Token refresh test failed', LogType.ERROR);
    return false;
  }

  // Test token cleanup
  if (!await testTokenCleanup()) {
    log('Token cleanup test failed', LogType.ERROR);
    return false;
  }

  log('\n=== Health Endpoint Tests Complete ===\n', LogType.INFO);
  return true;
}

// Run tests
runAllTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
