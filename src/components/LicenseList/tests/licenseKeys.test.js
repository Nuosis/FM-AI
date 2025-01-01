/* global process */
/**
 * License API Key Management Test
 * Tests the creation and management of License Keys using Organization API Key authentication.
 * 
 * Prerequisites:
 * 1. Start the backend server: (In most cases the backend will already be running)
 *    - Run ./start.sh in the project root
 *    - Or manually start the backend: cd backend && source venv/bin/activate && python main.py
 * 
 * 2. Required environment variables:
 *    - PUBLIC_KEY: Organization UUID
 *    - API_JWT: Organization API key JWT
 *    - API_KEY: Organization API key private key
 * 
 * The test will:
 * 1. Get organization API key from environment
 * 2. Get a license ID for the organization
 * 3. Create a new License key
 * 4. Test fetching all License keys
 * 5. Update the License key's modules
 * 6. Validate the License key
 * 7. Revoke the License key
 * 8. Verify the key was revoked
 */

import fetch from 'node-fetch';

// Define log types to match appSlice
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

const API_BASE_URL = process.env.VITE_API_BASE_URL; // Flask server port from main.py
const FRONTEND_BASE_URL = process.env.VITE_FRONTEND_BASE_URL
// Check required environment variables
if (! process.env.API_BASE_URL || !process.env.FRONTEND_BASE_URL || !process.env.PUBLIC_KEY || !process.env.API_JWT || !process.env.API_KEY) {
  console.error('\n[ERROR] Required environment variables are not set.');
  console.error('This test requires:');
  console.error('- PUBLIC_KEY: Organization UUID');
  console.error('- API_BASE_URL');
  console.error('- FRONTEND_BASE_URL');
  console.error('- API_JWT: Organization API key JWT');
  console.error('- API_KEY: Organization API key private key');
  process.exit(1);
}

// Test functions
async function runApiKeyTests() {
  let createdKeyId = null;
  let privateKey = null;
  let jwtToken = null;
  let licenseId = null;
  
  // Verify API key environment variables
  async function verifyApiKeyEnv() {
    try {
      log('Verifying API key environment variables...', LogType.INFO);
      
      if (!process.env.API_JWT || !process.env.API_KEY) {
        throw new Error('API_JWT and API_KEY environment variables must be set');
      }
      log('Successfully verified API key environment variables', LogType.INFO);
      return true;
    } catch (error) {
      log(`Failed to verify API key environment variables: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Get license ID for the authenticated organization
  async function getLicenseId() {
    try {
      log('Getting license ID...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/licenses`, {
        headers: {
          'Authorization': `ApiKey ${process.env.API_JWT}:${process.env.API_KEY}`,
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.length) {
        throw new Error('No licenses found');
      }
      
      licenseId = data[0].fieldData.__ID;
      log(`Found license ID: ${licenseId}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`Failed to get license ID: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Test creating API key
  async function testCreateApiKey() {
    try {
      log('Testing API key creation...', LogType.INFO);
      
      const requestData = {
        description: 'Test API Key',
        type: 'development',
        f_active: '1'
      };
      
      const response = await fetch(`${API_BASE_URL}/api/admin/licenses/${licenseId}/keys`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${process.env.API_JWT}:${process.env.API_KEY}`
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      log('Response data: received', LogType.DEBUG);
      
      // Store the key details for later use
      createdKeyId = responseData.data[0].fieldData.__ID;
      privateKey = responseData.data[0].fieldData.privateKey;
      jwtToken = responseData.data[0].fieldData.jwt;
      
      log(`Created API key with ID: ${createdKeyId}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`API key creation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test fetching License Keys
  async function testFetchApiKeys() {
    try {
      log('Testing License Keys fetch...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/licenses/${licenseId}/keys`, {
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Authorization': `ApiKey ${process.env.API_JWT}:${process.env.API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      log('Response data: received', LogType.DEBUG);

      // Validate each API key record
      responseData.forEach((key, index) => {
        // Convert modules string back to array for validation
        const modules = JSON.parse(key.fieldData.modules || '[]');
        
        // Validate required fields
        const required = ['description', 'type', 'f_active'];
        const missing = required.filter(field => !Object.prototype.hasOwnProperty.call(key.fieldData, field));
        
        if (missing.length > 0) {
          throw new Error(`API key ${index + 1} missing required fields: ${missing.join(', ')}`);
        }

        // Validate modules array
        if (!Array.isArray(modules)) {
          throw new Error(`API key ${index + 1} has invalid modules format`);
        }
      });

      log(`License Keys found: ${responseData.length}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`Test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test updating API key modules
  async function testUpdateApiKeyModules() {
    try {
      if (!createdKeyId) {
        throw new Error('No key ID available for update');
      }
      
      log('Testing API key modules update...', LogType.INFO);
      
      const updatedModules = ['module1', 'module4']; // Changed modules
      const updateData = {
        modules: JSON.stringify(updatedModules)
      };
      
      const response = await fetch(`${API_BASE_URL}/api/admin/licenses/${licenseId}/keys/${createdKeyId}/modules`, {
        method: 'PATCH',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${process.env.API_JWT}:${process.env.API_KEY}`
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      log('API key modules updated successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`API key modules update failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Test validating API key
  async function testValidateApiKey() {
    try {
      if (!jwtToken || !privateKey) {
        throw new Error('No API key credentials available for validation');
      }
      
      log('Testing API key validation...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/keys/validate`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Authorization': `ApiKey ${jwtToken}:${privateKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      log('Validation response: ' + JSON.stringify(responseData, null, 2), LogType.DEBUG);
      
      log('API key validated successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`API key validation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Test revoking API key
  async function testRevokeApiKey() {
    try {
      if (!createdKeyId) {
        throw new Error('No key ID available for revocation');
      }
      
      log('Testing API key revocation...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/licenses/${licenseId}/keys/${createdKeyId}/revoke`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Authorization': `ApiKey ${process.env.API_JWT}:${process.env.API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      log('API key revoked successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`API key revocation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Run all tests in sequence
  log('\n=== Starting LicenseKeys Tests ===\n', LogType.INFO);
  
  // First verify API key environment variables
  if (!await verifyApiKeyEnv()) {
    return false;
  }
  
  // Get license ID
  if (!await getLicenseId()) {
    return false;
  }
  
  // Create API key
  if (!await testCreateApiKey()) {
    return false;
  }
  
  // Fetch after create
  if (!await testFetchApiKeys()) {
    return false;
  }
  
  // Update modules
  if (!await testUpdateApiKeyModules()) {
    return false;
  }
  
  // Validate
  if (!await testValidateApiKey()) {
    return false;
  }
  
  // Revoke
  if (!await testRevokeApiKey()) {
    return false;
  }
  
  // Fetch after revoke
  if (!await testFetchApiKeys()) {
    return false;
  }
  
  log('\n=== All API Key Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runApiKeyTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
