/* global process */
import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import dotenv from 'dotenv';

// Load environment variables from frontend/.env
const result = dotenv.config({ path: process.cwd() + '/.env' });
if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

// Log environment variables for debugging
console.log('Environment variables loaded:', {
  API_BASE_URL: process.env.VITE_API_BASE_URL,
  FRONTEND_BASE_URL: process.env.VITE_FRONTEND_BASE_URL,
  PUBLIC_KEY: process.env.VITE_PUBLIC_KEY
});

// Define log types
const LogType = {
  INFO: 'info',
  WARNING: 'warning',
  DEBUG: 'debug',
  ERROR: 'error'
};

// Test configuration
const TEST_CONFIG = {
  credentials: {
    username: 'john.doe',
    password: 'Password123!' // Meets password requirements
  }
};

// Test configuration and logging setup
const log = (message, type = LogType.INFO) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
};

const API_BASE_URL = process.env.VITE_API_BASE_URL;
const PUBLIC_KEY = process.env.VITE_PUBLIC_KEY;

if (!API_BASE_URL || !PUBLIC_KEY) {
  throw new Error('Required environment variables are not set');
}

// Store tokens for use across tests
let accessToken = null;
let refreshToken = null;

// Helper function to encode credentials
const encodeCredentials = (username, password) => {
  return Buffer.from(`${username}:${password}`).toString('base64');
};

async function testSuccessfulLogin() {
  try {
    log('Testing successful login...', LogType.INFO);
    const credentials = encodeCredentials(
      TEST_CONFIG.credentials.username,
      TEST_CONFIG.credentials.password
    );
    
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify({ org_id: PUBLIC_KEY })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

    // Store tokens for subsequent tests
    accessToken = data.access_token;
    refreshToken = data.refresh_token;

    log('Login successful', LogType.INFO);
    return true;
  } catch (error) {
    log(`Login failed: ${error.message}`, LogType.ERROR);
    return false;
  }
}

async function testTokenRefresh() {
  try {
    log('Testing token refresh...', LogType.INFO);
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

    // Validate new token
    if (!data.access_token) {
      throw new Error('No access token in refresh response');
    }

    // Verify modules are included
    if (!data.modules || !Array.isArray(data.modules)) {
      throw new Error('Modules not included in refresh response');
    }

    accessToken = data.access_token;

    log('Token refresh successful', LogType.INFO);
    return true;
  } catch (error) {
    log(`Token refresh failed: ${error.message}`, LogType.ERROR);
    return false;
  }
}

// Get refresh token from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Please provide the refresh token as a command line argument');
  console.error('Usage: node refreshToken.test.js <refresh_token>');
  process.exit(1);
}

refreshToken = args[0];

// Run just the refresh token test
log('\n=== Starting Token Refresh Test ===\n', LogType.INFO);

testTokenRefresh().then(success => {
  if (!success) {
    process.exit(1);
  }
  log('\n=== Token Refresh Test Completed Successfully ===\n', LogType.INFO);
});
