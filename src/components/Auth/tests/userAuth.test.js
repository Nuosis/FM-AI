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
    password: 'Password123!', // Meets password requirements
    newPassword: 'NewPass456!' // Meets password requirements
  },
  maxLoginAttempts: 5, // Matches AUTH_CONFIG max_login_attempts
  lockoutDurationMinutes: 15 // Should match AUTH_CONFIG
};

// Test configuration and logging setup
const log = (message, type = LogType.INFO) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
};

const API_BASE_URL = process.env.VITE_API_BASE_URL;
const FRONTEND_BASE_URL = process.env.VITE_FRONTEND_BASE_URL;
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

async function runUserAuthTests() {
  // Test successful login
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
          //'Origin': FRONTEND_BASE_URL,
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

      // Validate response structure
      if (!data.access_token || !data.refresh_token || !data.user) {
        throw new Error('Missing required fields in response');
      }

      // Validate user has required fields
      if (!data.user.id || !data.user.org_id || !data.user.active_status) {
        throw new Error('Missing required user fields in response');
      }

      // Validate user is active
      if (data.user.active_status !== 'active') {
        throw new Error('User account is not active');
      }

      // Validate permitted modules are included
      if (!Array.isArray(data.user.permitted_modules)) {
        throw new Error('Permitted modules not included in response');
      }

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

  // Test account lockout
  async function testAccountLockout() {
    try {
      log('Testing account lockout...', LogType.INFO);
      
      // Use a dedicated account for lockout testing to avoid affecting other tests
      const lockoutTestCredentials = encodeCredentials('lockout_test@example.com', 'WrongPassword123!');
      
      // Attempt login multiple times to trigger lockout
      for (let i = 0; i < TEST_CONFIG.maxLoginAttempts; i++) {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            //'Origin': FRONTEND_BASE_URL,
            'Content-Type': 'application/json',
            'Authorization': `Basic ${lockoutTestCredentials}`
          },
          body: JSON.stringify({ org_id: PUBLIC_KEY })
        });

        const attemptData = await response.json();
        log(`Attempt ${i + 1} response: ${JSON.stringify(attemptData, null, 2)}`, LogType.DEBUG);
        
        if (response.ok) {
          throw new Error('Login should have failed but succeeded');
        }

        log(`Failed login attempt ${i + 1}/${TEST_CONFIG.maxLoginAttempts}`, LogType.INFO);
      }

      // Try one more time - should be locked out
      const finalResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          //'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
            'Authorization': `Basic ${lockoutTestCredentials}`
        },
        body: JSON.stringify({ org_id: PUBLIC_KEY })
      });

      const data = await finalResponse.json();
      
      // Debug log the response
      log('Lockout response: ' + JSON.stringify(data, null, 2), LogType.DEBUG);
      
      // Verify lockout message - check for either backend or frontend lockout message
      if (!data.error || (!data.error.includes('locked') && !data.error.includes('Try again in'))) {
        throw new Error('Account should be locked but no lockout message received');
      }

      log('Account lockout test passed', LogType.INFO);
      return true;
    } catch (error) {
      log(`Account lockout test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test failed login
  async function testFailedLogin() {
    try {
      log('Testing failed login...', LogType.INFO);
      
      const credentials = encodeCredentials('wrong.user', 'wrongpass');
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          //'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`
        },
        body: JSON.stringify({ org_id: PUBLIC_KEY })
      });

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

  // Test token refresh
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

      // Validate new token and permissions
      if (!data.access_token) {
        throw new Error('No access token in refresh response');
      }

      // Verify permitted modules are preserved
      if (!data.permitted_modules || !Array.isArray(data.permitted_modules)) {
        throw new Error('Permitted modules not included in refresh response');
      }

      accessToken = data.access_token;

      log('Token refresh successful', LogType.INFO);
      return true;
    } catch (error) {
      log(`Token refresh failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test session validation
  async function testSessionValidation() {
    try {
      log('Testing session validation...', LogType.INFO);
      
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

      // Validate user info and permissions
      if (!data.user || !data.user.id || !data.user.org_id) {
        throw new Error('Invalid user info in response');
      }

      if (!data.user.permitted_modules || !Array.isArray(data.user.permitted_modules)) {
        throw new Error('Permitted modules not included in validation response');
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
        const response = await fetch(`${API_BASE_URL}/api/auth/password/change`, {
          method: 'POST',
          headers: {
            //'Origin': FRONTEND_BASE_URL,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            current_password: TEST_CONFIG.credentials.password,
            new_password: password
          })
        });

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
      
      if (!accessToken) {
        throw new Error('No access token available');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/password/change`, {
        method: 'POST',
        headers: {
          //'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          current_password: TEST_CONFIG.credentials.password,
          new_password: TEST_CONFIG.credentials.newPassword
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Verify login works with new password
      const newCredentials = encodeCredentials(
        TEST_CONFIG.credentials.username,
        TEST_CONFIG.credentials.newPassword
      );

      const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `Basic ${newCredentials}`
        },
        body: JSON.stringify({ org_id: PUBLIC_KEY })
      });

      if (!loginResponse.ok) {
        throw new Error('Login failed with new password');
      }

      // Change password back to original
      const revertResponse = await fetch(`${API_BASE_URL}/api/auth/password/change`, {
        method: 'POST',
        headers: {
          //'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          current_password: TEST_CONFIG.credentials.newPassword,
          new_password: TEST_CONFIG.credentials.password
        })
      });

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
      
      const response = await fetch(`${API_BASE_URL}/api/auth/password/reset-request`, {
        method: 'POST',
        headers: {
          //'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: TEST_CONFIG.credentials.username
        })
      });

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
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          //'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Verify refresh token is invalidated
      const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          //'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (refreshResponse.ok) {
        throw new Error('Refresh token should be invalidated after logout');
      }

      // Clear tokens
      accessToken = null;
      refreshToken = null;

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
  if (!await testAccountLockout()) return false;
  if (!await testSuccessfulLogin()) return false;

  // Session tests
  if (!await testSessionValidation()) return false;
  if (!await testTokenRefresh()) return false;

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
