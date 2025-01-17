/* 
AI_NOTE:
  This process is now working. The file should not be modified unless explicitly permitted. You must ask the user if they want you to make these changes and they must write back in the affirmative. 

  Org UUID is the VITE_PUBLIC KEY which is in the .env
  /frontend/scripts/generate-jwt.js generate Org based API Keys and stores them in the .env
  Org Based API keys can be used to generate License Based License Keys which will be needed for machine to machine auth


  Every Org must have a License

  License can expire

  Licenses (parent) relate to Modules Selected (children) which track via _moduleID permitted modules

  Licenses have License Keys which must be generated for machine to machine auth to work 

  See AUTH_PLAN.md
*/

/* global process */
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define log types for consistent logging
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

// Test configuration and environment validation
const API_BASE_URL = process.env.VITE_API_BASE_URL;
const PUBLIC_KEY = process.env.VITE_PUBLIC_KEY;
const API_JWT = process.env.VITE_API_JWT;
const API_KEY = process.env.VITE_API_KEY;

if (!API_BASE_URL || !FRONTEND_BASE_URL || !PUBLIC_KEY || !API_JWT || !API_KEY) {
  throw new Error('Required environment variables are not set');
}

//API key credentials
const API_CREDENTIALS = {
  jwt: process.env.VITE_API_JWT,
  privateKey: process.env.VITE_API_KEY
};

async function testMachineToMachineAuth() {
  // Create a basic 30-day license
  async function createBasicLicense() {
    try {
      log('Creating basic 30-day license...', LogType.INFO);
      
      const today = new Date();
      const licenseData = {
        dateStart: today.toISOString().split('T')[0], // YYYY-MM-DD format
        f_active: 1,
        maxDevices: 100,
        licenseTerm: 30,
        licenseTermUnit: 'days',
        orgName: 'Auto-generated License',
        userName: 'system',
        _orgID: PUBLIC_KEY
      };
      
      const response = await fetch(`${API_BASE_URL}/api/admin/licenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${API_CREDENTIALS.jwt}:${API_CREDENTIALS.privateKey}`
        },
        body: JSON.stringify(licenseData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      log('Basic license created successfully', LogType.INFO);
      return data.data[0].recordId;
    } catch (error) {
      log(`Failed to create basic license: ${error.message}`, LogType.ERROR);
      return null;
    }
  }

  // Test organization license verification
  async function testOrgLicenseVerification() {
    try {
      log('Testing organization license verification...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/licenses`, {
        headers: {
          'Authorization': `ApiKey ${API_CREDENTIALS.jwt}:${API_CREDENTIALS.privateKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const licenses = Array.isArray(data) ? data : (data.data || []);
      
      // Find license for current organization
      const orgLicense = licenses.find(license => 
        license.fieldData && license.fieldData._orgID === PUBLIC_KEY
      );

      if (!orgLicense) {
        log('No license found for organization, creating basic license...', LogType.INFO);
        const newLicenseId = await createBasicLicense();
        if (!newLicenseId) {
          throw new Error('Failed to create basic license');
        }
        // Retry verification with new license
        return await testOrgLicenseVerification();
      }

      // Verify license is active
      if (Number(orgLicense.fieldData.f_active) !== 1) {
        log('License is not active', LogType.ERROR);
        throw new Error('License is not active');
      }

      // Parse dates and verify license hasn't expired
      const now = new Date();
      const startDate = new Date(orgLicense.fieldData.dateStart.split('/').reverse().join('-'));
      const endDate = new Date(orgLicense.fieldData.dateEnd.split('/').reverse().join('-'));

      if (now < startDate || now > endDate) {
        log('License has expired', LogType.ERROR);
        throw new Error('License has expired');
      }

      const licenseId = orgLicense.fieldData.__ID;
      log('Organization license verification successful', LogType.INFO);
      log(`License Details:`, LogType.DEBUG);
      log(`- Start Date: ${orgLicense.fieldData.dateStart}`, LogType.DEBUG);
      log(`- End Date: ${orgLicense.fieldData.dateEnd}`, LogType.DEBUG);
      log(`- Active: ${Boolean(Number(orgLicense.fieldData.f_active))}`, LogType.DEBUG);
      
      return { success: true, licenseId };
    } catch (error) {
      log(`Organization license verification failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test API key validation (ApiKey auth)
  async function testApiKeyValidation() {
    try {
      log('Testing ApiKey authentication...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/keys/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `ApiKey ${API_CREDENTIALS.jwt}:${API_CREDENTIALS.privateKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate response contains required fields
      const requiredFields = ['org_id', 'modules', 'key_id', 'type'];
      const missingFields = requiredFields.filter(field => !data[field]);
      if (missingFields.length > 0) {
        log(`Missing required fields: ${missingFields.join(', ')}`, LogType.ERROR);
        throw new Error('Invalid validation response structure');
      }

      // Log non-sensitive fields for debugging
      log('Received fields:', LogType.DEBUG);
      const safeFields = ['description', 'modules', 'org_id', 'timestamp', 'type'];
      safeFields.forEach(field => {
        if (data[field]) {
          log(`${field}: ${JSON.stringify(data[field])}`, LogType.DEBUG);
        }
      });

      // Verify organization binding matches expected
      if (data.org_id !== PUBLIC_KEY) {
        log(`Organization binding mismatch. Expected: ${PUBLIC_KEY}, Got: ${data.org_id}`, LogType.ERROR);
        throw new Error('Organization binding mismatch');
      }

      // Verify token type is m2m
      if (data.type !== 'm2m') {
        log(`Invalid token type. Expected: m2m, Got: ${data.type}`, LogType.ERROR);
        throw new Error('Invalid token type');
      }

      log('ApiKey authentication successful', LogType.INFO);
      return true;
    } catch (error) {
      log(`ApiKey authentication failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Create API key for license
  async function createApiKey(licenseId) {
    try {
      log('Creating API key...', LogType.INFO);
      
      const requestData = {
        description: 'Auto-generated API Key',
        type: 'development',
        f_active: '1',
        modules: '[]' // Empty modules array
      };
      
      const response = await fetch(`${API_BASE_URL}/api/licenses/${licenseId}/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${API_CREDENTIALS.jwt}:${API_CREDENTIALS.privateKey}`
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await response.json();
      log('API key created successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Failed to create API key: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test License Keys
  async function testLicenseApiKeys(providedLicenseId = null) {
    try {
      log('Verifying License Keys...', LogType.INFO);
      
      let licenseId = providedLicenseId;
      
      // Only fetch license if ID not provided
      if (!licenseId) {
        log('No license ID provided, fetching license...', LogType.DEBUG);
        const licenseResponse = await fetch(`${API_BASE_URL}/api/admin/licenses`, {
          headers: {
            'Authorization': `ApiKey ${API_CREDENTIALS.jwt}:${API_CREDENTIALS.privateKey}`
          }
        });

        if (!licenseResponse.ok) {
          throw new Error(`HTTP error! status: ${licenseResponse.status}`);
        }

        const licenseData = await licenseResponse.json();
        const licenses = Array.isArray(licenseData) ? licenseData : (licenseData.data || []);
        const orgLicense = licenses.find(license => 
          license.fieldData && license.fieldData._orgID === PUBLIC_KEY
        );

        if (!orgLicense) {
          throw new Error('Organization license not found');
        }

        licenseId = orgLicense.fieldData.__ID;
      }

      // Now get the License Keys for this license
      const apiKeysResponse = await fetch(`${API_BASE_URL}/api/licenses/${licenseId}/keys`, {
        headers: {
          'Authorization': `ApiKey ${API_CREDENTIALS.jwt}:${API_CREDENTIALS.privateKey}`
        }
      });

      if (!apiKeysResponse.ok) {
        throw new Error(`HTTP error! status: ${apiKeysResponse.status}`);
      }

      const apiKeysData = await apiKeysResponse.json();
      const apiKeys = Array.isArray(apiKeysData) ? apiKeysData : [];

      if (apiKeys.length === 0) {
        log('No License Keys found for license, creating new API key...', LogType.INFO);
        const created = await createApiKey(licenseId);
        if (!created) {
          throw new Error('Failed to create API key');
        }
        // Retry verification with new API key
        return await testLicenseApiKeys(licenseId);
      }

      // Verify at least one active API key exists
      const activeKeys = apiKeys.filter(key => Number(key.fieldData.f_active) === 1);
      if (activeKeys.length === 0) {
        log('No active License Keys found for license, creating new API key...', LogType.INFO);
        const created = await createApiKey(licenseId);
        if (!created) {
          throw new Error('Failed to create API key');
        }
        // Retry verification with new API key
        return await testLicenseApiKeys(licenseId);
      }

      log(`Found ${activeKeys.length} active License Keys for license`, LogType.INFO);
      return true;
    } catch (error) {
      log(`License Keys verification failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Run machine-to-machine auth tests
  log('\n=== Frontend Auth Init ===\n', LogType.INFO);

  // Test API key validation first
  if (!await testApiKeyValidation()) return false;

  // Test organization license verification
  const licenseResult = await testOrgLicenseVerification();
  if (!licenseResult.success) return false;

  // Test License Keys using the license ID from verification
  if (!await testLicenseApiKeys(licenseResult.licenseId)) return false;

  log('\n=== Frontend Auth Init Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
testMachineToMachineAuth().then(success => {
  if (!success) {
    process.exit(1);
  }
});
