import fetch from 'node-fetch';
import { Buffer as BufferClass } from 'buffer';
const Buffer = BufferClass.Buffer;
import dotenv from 'dotenv';
import https from 'https';
import process from 'process';

// Load environment variables from frontend/.env
const result = dotenv.config({ path: process.cwd() + '/.env' });
if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

// Log environment variables for debugging
console.log('Environment variables loaded:', {
  API_BASE_URL: process.env.VITE_API_BASE_URL,
  PUBLIC_KEY: process.env.VITE_PUBLIC_KEY
});

const API_BASE_URL = process.env.VITE_API_BASE_URL;
const PUBLIC_KEY = process.env.VITE_PUBLIC_KEY;

if (!API_BASE_URL || !PUBLIC_KEY ) {
  throw new Error('Required environment variables are not set');
}

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
    username: process.env.TEST_USER || 'jonnytest@tester.com',
    password: process.env.TEST_PASSWORD || 'Password123!',
    newPassword: 'NewPass456!' // Meets password requirements
  },
  maxLoginAttempts: 5, // Matches AUTH_CONFIG max_login_attempts
  lockoutDurationMinutes: 15 // Should match AUTH_CONFIG
};

// Additional error handling for environment variables
console.log('Test configuration:', {
  username: TEST_CONFIG.credentials.username,
  password: TEST_CONFIG.credentials.password,
  API_BASE_URL: API_BASE_URL,
  PUBLIC_KEY: PUBLIC_KEY
});

// Test configuration and logging setup
const log = (message, type = LogType.INFO) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
};

// Helper function to encode credentials
const encodeCredentials = (username, password) => {
  return Buffer.from(`${username}:${password}`).toString('base64');
};

// Helper function for fetch options with cookie handling
const getFetchOptions = (method = 'GET', headers = {}, body = null) => {
  const options = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    // Required for node-fetch to handle cookies
    agent: API_BASE_URL.startsWith('https') ? 
      new https.Agent({ rejectUnauthorized: false }) : // Only for testing environment
      undefined
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return options;
};

// Store cookies between requests
let cookies = new Map();

// Helper function to parse Set-Cookie headers
const parseCookies = (headers) => {
  if (!headers) {
    log('No headers provided');
    return;
  }

  // Debug headers
  console.log('Headers:', headers);

  try {
    // Handle both raw headers and regular headers
    let rawCookies;
    if (typeof headers.raw === 'function') {
      const rawHeaders = headers.raw();
      console.log('Raw headers:', rawHeaders);
      rawCookies = rawHeaders['set-cookie'];
    } else if (typeof headers.get === 'function') {
      const cookieHeader = headers.get('set-cookie');
      rawCookies = cookieHeader ? [cookieHeader] : undefined;
    } else if (headers.getAll) {
      // Some fetch implementations use getAll
      rawCookies = headers.getAll('set-cookie');
    }
    
    if (!rawCookies || !Array.isArray(rawCookies)) {
      log('No valid cookies found in response');
      return;
    }
    
    log('Raw cookies:', rawCookies);
  
    rawCookies.forEach(cookie => {
      const parts = cookie.split(';');
      const [nameValue] = parts;
      const [name, value] = nameValue.split('=');
      
      // Store both the value and attributes
      const attributes = {};
      parts.slice(1).forEach(part => {
        const [key, val] = part.trim().split('=');
        attributes[key.toLowerCase()] = val || true;
      });
      
      cookies.set(name, {
        value,
        ...attributes
      });
    });
  } catch (error) {
    console.error('Error parsing cookies:', error);
  }
};

// Helper to format cookies for request header
const formatCookies = () => {
  return Array.from(cookies.entries())
    .map(([name, cookie]) => `${name}=${cookie.value}`)
    .join('; ');
};

async function runUserAuthTests() {

  // Test failed login
  async function testFailedLogin() {
    try {
      log('Testing failed login...', LogType.INFO);
      
      const credentials = encodeCredentials('wrong.user', 'wrongpass');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, getFetchOptions(
        'POST',
        { 'Authorization': `Basic ${credentials}` },
        { org_id: PUBLIC_KEY }
      ));

      if (response.ok) {
        throw new Error('Login should have failed but succeeded');
      }

      log('Failed login test passed (login was rejected as expected)', LogType.INFO);
      return true;
    } catch (error) {
      if (error.message === 'Login should have failed but succeeded') {
        log(error.message, LogType.ERROR);
        return false;
      }
      log('Failed login test passed (login was rejected as expected)', LogType.INFO);
      return true;
    }
  }

  // Test successful login
  async function testSuccessfulLogin() {
    try {
      log('Testing successful login...', LogType.INFO);
      const credentials = encodeCredentials(
        TEST_CONFIG.credentials.username,
        TEST_CONFIG.credentials.password
      );

      log('credentials: ' + JSON.stringify(credentials, null, 2), LogType.DEBUG);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, getFetchOptions('POST', 
        { 
          'Authorization': `Basic ${credentials}`
        }, 
        { org_id: PUBLIC_KEY }
      ));
      
      // Handle error cases first
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      // Parse and store cookies from response
      parseCookies(response.headers);
      
      // Get response data
      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);
      
      // Store access token as cookie
      cookies.set('access_token', {
        value: data.access_token,
        secure: true,
        httponly: true,
        path: '/'
      });
      
      // Debug log cookies
      console.log('Stored cookies:', Object.fromEntries(cookies));
      
      // Validate user data in response
      if (!data.user || !data.user.id || !data.user.org_id) {
        throw new Error('Invalid user data in response');
      }

      // Validate modules
      if (!Array.isArray(data.user.modules)) {
        throw new Error('Modules not included in response');
      }

      log('Login successful', LogType.INFO);
      return true;
    } catch (error) {
      log(`Login failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test session validation
  async function testSessionValidation() {
    try {
      log('Testing session validation...', LogType.INFO);

      const response = await fetch(`${API_BASE_URL}/api/auth/validate`, getFetchOptions('GET', {
        'Cookie': formatCookies()
      }));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

      // Validate user info and permissions
      if (!data.user || !data.user.id || !data.user.org_id) {
        throw new Error('Invalid user info in response');
      }

      if (!data.user.modules || !Array.isArray(data.user.modules)) {
        throw new Error('Modules not included in validation response');
      }

      log('Session validation successful', LogType.INFO);
      return true;
    } catch (error) {
      log(`Session validation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test password validation
  async function testPasswordValidation() {
    try {
      log('Testing password validation...', LogType.INFO);
      
      const invalidPasswords = [
        'short', // Too short
        'nouppercase123!', // No uppercase
        'NOLOWERCASE123!', // No lowercase
        'NoNumbers!', // No numbers
        'NoSpecial123' // No special characters
      ];

      for (const password of invalidPasswords) {
        const response = await fetch(`${API_BASE_URL}/api/auth/password/change`, getFetchOptions(
          'POST',
          {
            'Cookie': formatCookies()
          },
          {
            current_password: TEST_CONFIG.credentials.password,
            new_password: password
          }
        ));

        if (response.ok) {
          throw new Error(`Password validation should have failed for: ${password}`);
        }

        const data = await response.json();
        log(`Password validation response: ${JSON.stringify(data, null, 2)}`, LogType.DEBUG);
        if (!data.error || !data.error.includes('Password must')) {
          throw new Error(`Expected password requirement error message, got: ${JSON.stringify(data)}`);
        }
      }

      log('Password validation test passed', LogType.INFO);
      return true;
    } catch (error) {
      log(`Password validation test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test password change
  async function testPasswordChange() {
    try {
      log('Testing password change...', LogType.INFO);

      const response = await fetch(`${API_BASE_URL}/api/auth/password/change`, getFetchOptions(
        'POST',
          {
            'Cookie': formatCookies()
          },
        {
          current_password: TEST_CONFIG.credentials.password,
          new_password: TEST_CONFIG.credentials.newPassword
        }
      ));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Verify login works with new password
      const newCredentials = encodeCredentials(
        TEST_CONFIG.credentials.username,
        TEST_CONFIG.credentials.newPassword
      );

      const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, getFetchOptions(
        'POST',
        { 'Authorization': `Basic ${newCredentials}` },
        { org_id: PUBLIC_KEY }
      ));

      if (!loginResponse.ok) {
        throw new Error('Login failed with new password');
      }

      // Change password back to original
      const revertResponse = await fetch(`${API_BASE_URL}/api/auth/password/change`, getFetchOptions(
        'POST',
          {
            'Cookie': formatCookies()
          },
        {
          current_password: TEST_CONFIG.credentials.newPassword,
          new_password: TEST_CONFIG.credentials.password
        }
      ));

      if (!revertResponse.ok) {
        throw new Error('Failed to revert password');
      }

      log('Password change successful', LogType.INFO);
      return true;
    } catch (error) {
      log(`Password change failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test password reset request
  async function testPasswordResetRequest() {
    try {
      log('Testing password reset request...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/password/reset-request`, getFetchOptions(
        'POST',
          {
            'Cookie': formatCookies()
          },
        { username: TEST_CONFIG.credentials.username }
      ));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

      // Verify we get the generic success message
      if (!data.message || !data.message.includes('If the account exists')) {
        throw new Error('Expected generic success message for password reset request');
      }

      log('Password reset flow successful', LogType.INFO);
      return true;
    } catch (error) {
      log(`Password reset flow failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test logout
  async function testLogout() {
    try {
      log('Testing logout...', LogType.INFO);

      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, getFetchOptions('POST'));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Clear local cookies
      cookies.clear();

      // Verify session is invalidated
      const validateResponse = await fetch(`${API_BASE_URL}/api/auth/validate`, getFetchOptions('GET'));

      if (validateResponse.ok) {
        throw new Error('Session should be invalidated after logout');
      }

      log('Logout successful', LogType.INFO);
      return true;
    } catch (error) {
      log(`Logout failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Run all tests in sequence
  log('\n=== Starting User Authentication Tests ===\n', LogType.INFO);

  // Login tests
  if (!await testFailedLogin()) return false;
  // if (!await testAccountLockout()) return false;
  if (!await testSuccessfulLogin()) return false;

  // Session tests
  if (!await testSessionValidation()) return false;

  // Password management tests
  if (!await testPasswordValidation()) return false;
  if (!await testPasswordChange()) return false;
  if (!await testPasswordResetRequest()) return false;

  // Logout test
  if (!await testLogout()) return false;

  log('\n=== All User Authentication Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runUserAuthTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
