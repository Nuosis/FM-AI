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

if (!API_BASE_URL) {
  throw new Error('Required environment variables are not set');
}

// Test unprotected /health endpoint
export async function testHealth() {
  try {
    log('Testing unprotected /health endpoint...', LogType.INFO);
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    //log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

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

// Test /health-secure with Bearer token
/**
 * curl -v -X GET "http://192.168.1.80:5001/health-secure" \
  -H "Origin: http://192.168.1.80:5173" \
  -H "Authorization: ApiKey 46e4cf9a-41b7-4187-9512-f8f706592e1b:84db4898c23d63aa68d1e5ea9736e496295f644722d4c8826966f9c6fd126471"
*/
export async function testHealthSecureBearer(accessToken) {
  try {
    log('Testing /health-secure with Bearer token...', LogType.INFO);
    
    const response = await fetch(`${API_BASE_URL}/api/admin/health-secure`, {
      headers: {
      //'Origin': FRONTEND_BASE_URL,
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    //log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

    if (!data.status || data.status !== 'healthy') {
      throw new Error('Invalid response from health-secure endpoint');
    }

    log('Health-secure Bearer test passed', LogType.INFO);
    return true;
  } catch (error) {
    log(`Health-secure Bearer test failed: ${error.message}`, LogType.ERROR);
    return false;
  }
}

// Test /health-secure with Basic auth
export async function testHealthSecureBasic(username, password) {
  try {
    log('Testing /health-secure with Basic auth...', LogType.INFO);
    
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    
    const response = await fetch(`${API_BASE_URL}/api/admin/health-secure`, {
      headers: {
        //'Origin': FRONTEND_BASE_URL,
        'Authorization': `Basic ${credentials}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    //log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

    if (!data.status || data.status !== 'healthy') {
      throw new Error('Invalid response from health-secure endpoint');
    }

    log('Health-secure Basic auth test passed', LogType.INFO);
    return true;
  } catch (error) {
    log(`Health-secure Basic auth test failed: ${error.message}`, LogType.ERROR);
    return false;
  }
}

// Test /health-secure with ApiKey
export async function testHealthSecureApiKey(apiKey, privateKey) {
  try {
    log('Testing /health-secure with ApiKey...', LogType.INFO);
    
    const response = await fetch(`${API_BASE_URL}/api/admin/health-secure`, {
      headers: {
        //'Origin': FRONTEND_BASE_URL,
        'Authorization': `ApiKey ${apiKey}:${privateKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    //log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

    if (!data.status || data.status !== 'healthy') {
      throw new Error('Invalid response from health-secure endpoint');
    }

    log('Health-secure ApiKey test passed', LogType.INFO);
    return true;
  } catch (error) {
    log(`Health-secure ApiKey test failed: ${error.message}`, LogType.ERROR);
    return false;
  }
}

// Test /health-secure with LicenseKey
export async function testHealthSecureLicenseKey(licenseKey, privateKey) {
  try {
    log('Testing /health-secure with LicenseKey...', LogType.INFO);
    
    const response = await fetch(`${API_BASE_URL}/api/admin/health-secure`, {
      headers: {
        //'Origin': FRONTEND_BASE_URL,
        'Authorization': `LicenseKey ${licenseKey}:${privateKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    //log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

    if (!data.status || data.status !== 'healthy') {
      throw new Error('Invalid response from health-secure endpoint');
    }

    log('Health-secure LicenseKey test passed', LogType.INFO);
    return true;
  } catch (error) {
    log(`Health-secure LicenseKey test failed: ${error.message}`, LogType.ERROR);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  log('\n=== Starting Health Endpoint Tests ===\n', LogType.INFO);

  // Test unprotected endpoint
  if (!await testHealth()) {
    log('Unprotected health test failed, stopping tests', LogType.ERROR);
    return false;
  }

  // Initialize test array
  const tests = [];

  // Skip Bearer token test since we're not authenticated (would need active session)
  // log('Skipping Bearer token test - not authenticated (isAuthenticated: false)', LogType.WARNING);

  // Add remaining tests
  tests.push(
    testHealthSecureBasic(
      process.env.TEST_USER,
      process.env.TEST_PASSWORD
    ),
    testHealthSecureApiKey(
      process.env.VITE_API_KEY,
      process.env.VITE_PUBLIC_KEY
    ),
    testHealthSecureLicenseKey(
      process.env.VITE_API_JWT,
      process.env.VITE_API_KEY
    )
  );

  // Run all tests
  const results = await Promise.all(tests);

  // Consider test successful if ApiKey and LicenseKey tests pass
  const criticalTests = [
    results[results.length - 2], // ApiKey test
    results[results.length - 1],  // LicenseKey test
    results[results.length - 0]  // Basic Auth test
  ];
  const allPassed = criticalTests.every(result => result === true);
  
  if (allPassed) {
    log('\n=== All Health Endpoint Tests Passed ===\n', LogType.INFO);
  } else {
    log('\n=== Some Health Endpoint Tests Failed ===\n', LogType.ERROR);
  }

  return allPassed;
}

// Run tests
runAllTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
