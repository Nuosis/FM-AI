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

// Helper function for fetch options with credentials
const getFetchOptions = (method = 'GET', headers = {}, body = null) => {
  const options = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  // Add access token cookie if available
  if (accessToken) {
    options.headers.Cookie = `access_token=${accessToken}`;
  }
  return options;
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

// Test /health/token with session cookie
export async function testHealthSecureToken() {
  try {
    log('Testing /api/auth/health/token with session cookie...', LogType.INFO);
    
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

// Test /health/apikey with ApiKey
export async function testHealthSecureApiKey() {
  try {
    log('Testing /api/auth/health/apikey with ApiKey...', LogType.INFO);
    
    const response = await fetch(`${API_BASE_URL}/api/auth/health/apikey`, getFetchOptions(
      'GET',
      { 'Authorization': `ApiKey ${process.env.VITE_API_JWT}:${process.env.VITE_API_KEY}` }
    ));

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.status || data.status !== 'healthy' || data.auth !== 'apikey') {
      throw new Error('Invalid response from health/apikey endpoint');
    }

    log('Auth health ApiKey test passed', LogType.INFO);
    return true;
  } catch (error) {
    log(`Auth health ApiKey test failed: ${error.message}`, LogType.ERROR);
    return false;
  }
}

// Test /health/basic with Basic Auth
export async function testHealthSecureBasicAuth() {
  try {
    log('Testing /api/auth/health/basic with Basic Auth...', LogType.INFO);
    
    const credentials = Buffer.from(`${TEST_USER}:${TEST_PASSWORD}`).toString('base64');
    const response = await fetch(`${API_BASE_URL}/api/auth/health/basic`, getFetchOptions(
      'GET',
      { 'Authorization': `Basic ${credentials}` }
    ));

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.status || data.status !== 'healthy' || data.auth !== 'basic') {
      throw new Error('Invalid response from health/basic endpoint');
    }

    log('Auth health Basic Auth test passed', LogType.INFO);
    return true;
  } catch (error) {
    log(`Auth health Basic Auth test failed: ${error.message}`, LogType.ERROR);
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
      body: JSON.stringify({ org_id: process.env.VITE_PUBLIC_KEY }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Login failed with status: ${response.status}`);
    }

    const headers = response.headers
    log(JSON.stringify(headers), LogType.INFO)

    const data = await response.json();
    log(JSON.stringify(data), LogType.INFO)
    if (!data.user || !data.access_token) {
      throw new Error('Login response missing user data or access token');
    }

    // Store access token for subsequent requests
    accessToken = data.access_token;
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
  }

  // Test API key auth
  if (!await testHealthSecureApiKey()) {
    log('Auth health API key test failed', LogType.ERROR);
  }

  // Test basic auth
  if (!await testHealthSecureBasicAuth()) {
    log('Auth health basic auth test failed', LogType.ERROR);
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
