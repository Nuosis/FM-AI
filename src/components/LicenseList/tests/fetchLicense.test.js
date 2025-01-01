/* global process */
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from frontend/.env
const result = dotenv.config({ path: process.cwd() + '/.env' });
if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

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

// Load and validate required environment variables
const API_BASE_URL = process.env.VITE_API_BASE_URL;
const FRONTEND_BASE_URL = process.env.VITE_FRONTEND_BASE_URL;
const ORG_ID = process.env.VITE_TEST_ORG_ID;

// Log environment variables for debugging
console.log('Environment variables loaded:', {
  API_BASE_URL,
  FRONTEND_BASE_URL,
  ORG_ID
});

if (!API_BASE_URL || !FRONTEND_BASE_URL || !ORG_ID) {
  throw new Error('Required environment variables are not set');
}

// Test configuration
const TEST_CONFIG = {
  licenseData: {
    dateStart: '2024-01-01',
    f_active: 1,
    maxDevices: 100,
    licenseTerm: 12,
    licenseTermUnit: 'months',
    orgName: 'Test Organization',
    userName: 'test.user',
    _orgID: ORG_ID
  },
  updateData: {
    dateStart: '2024-01-01',
    f_active: 1,
    maxDevices: 50,
    licenseTerm: 24,
    licenseTermUnit: 'months',
    orgName: 'Updated Organization',
    userName: 'updated.user'
  },
  validTermUnits: ['days', 'months', 'years'],
  requiredFields: ['dateStart', 'dateEnd', 'f_active', 'maxDevices', 'licenseTerm', 'licenseTermUnit', '_privateKEY', '__ID']
};

// Test functions
async function checkBackendHealth() {
  try {
    log('Checking backend health...', LogType.INFO);
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: {
        'Origin': FRONTEND_BASE_URL
      }
    });
    
    if (!response.ok) {
      throw new Error(`Backend health check failed with status: ${response.status}`);
    }

    const data = await response.json();
    log('Backend health check response: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

    if (!data.status || data.status !== 'healthy') {
      throw new Error('Backend reported unhealthy status');
    }

    log('Backend health check passed', LogType.INFO);
    return true;
  } catch (error) {
    log(`Backend health check failed: ${error.message}`, LogType.ERROR);
    log('Please verify API_BASE_URL is correct and backend is running', LogType.ERROR);
    return false;
  }
}

async function runLicenseTests() {
  // Check backend health before running tests
  if (!await checkBackendHealth()) {
    return false;
  }

  let createdLicenseId = null;
  
  // Test creating license
  async function testCreateLicense() {
    try {
      log('Testing license creation...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/licenses`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(TEST_CONFIG.licenseData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);
      createdLicenseId = data.data[0].recordId;
      log(`Created license with ID: ${createdLicenseId}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`License creation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test fetching licenses
  async function testFetchLicense() {
    try {
      log('Testing organization license fetch...', LogType.INFO);
      log(`Organization ID: ${ORG_ID}`, LogType.DEBUG);

      const response = await fetch(`${API_BASE_URL}/api/admin/licenses`, {
        headers: {
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

      // Handle both direct array response and nested data array response
      const licenses = Array.isArray(data) ? data : (data.data || []);
      
      if (!Array.isArray(licenses)) {
        throw new Error('Response data should be an array');
      }

      // Validate each license record
      licenses.forEach((license, index) => {
        if (!license.fieldData) {
          throw new Error(`License ${index + 1} missing fieldData`);
        }
        
        const missing = TEST_CONFIG.requiredFields.filter(field => 
          !Object.prototype.hasOwnProperty.call(license.fieldData, field)
        );
        
        if (missing.length > 0) {
          throw new Error(`License ${index + 1} missing required fields: ${missing.join(', ')}`);
        }

        // Validate date formats
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!dateRegex.test(license.fieldData.dateStart) || !dateRegex.test(license.fieldData.dateEnd)) {
          log(`Warning: License ${index + 1} has non-standard date format`, LogType.WARNING);
        }

        // Validate f_active value
        if (![0, 1].includes(Number(license.fieldData.f_active))) {
          log(`Warning: License ${index + 1} has invalid f_active value`, LogType.WARNING);
        }

        // Validate licenseTermUnit
        if (!TEST_CONFIG.validTermUnits.includes(license.fieldData.licenseTermUnit)) {
          log(`Warning: License ${index + 1} has non-standard term unit`, LogType.WARNING);
        }

        // Validate private key format (UUID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(license.fieldData._privateKEY)) {
          log(`Warning: License ${index + 1} has invalid private key format`, LogType.WARNING);
        }
      });

      // Log license information
      log(`Licenses found: ${licenses.length}`, LogType.INFO);
      licenses.forEach((license, index) => {
        log(`License ${index + 1}:`, LogType.INFO);
        log(`- Active: ${Boolean(Number(license.fieldData.f_active))}`, LogType.INFO);
        log(`- Start Date: ${license.fieldData.dateStart}`, LogType.INFO);
        log(`- End Date: ${license.fieldData.dateEnd}`, LogType.INFO);
        log(`- Max Devices: ${license.fieldData.maxDevices}`, LogType.INFO);
        log(`- License Term: ${license.fieldData.licenseTerm} ${license.fieldData.licenseTermUnit}`, LogType.INFO);
        log(`- Organization: ${license.fieldData.orgName}`, LogType.INFO);
        log(`- User: ${license.fieldData.userName}`, LogType.INFO);
        log(`- Private Key: ${license.fieldData._privateKEY}`, LogType.INFO);
      });

      log('Test completed successfully!', LogType.INFO);
      return true;
    } catch (error) {
      log(`Test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test updating license
  async function testUpdateLicense() {
    try {
      if (!createdLicenseId) {
        throw new Error('No license ID available for update');
      }
      
      log('Testing license update...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/licenses/${createdLicenseId}`, {
        method: 'PATCH',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(TEST_CONFIG.updateData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      log('License updated successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`License update failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Test deleting license
  async function testDeleteLicense() {
    try {
      if (!createdLicenseId) {
        throw new Error('No license ID available for deletion');
      }
      
      log('Testing license deletion...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/licenses/${createdLicenseId}`, {
        method: 'DELETE',
        headers: {
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      log('License deleted successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`License deletion failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Run all tests in sequence
  log('\n=== Starting License CRUD Tests ===\n', LogType.INFO);
  
  // Create
  if (!await testCreateLicense()) {
    return false;
  }
  
  // Fetch after create
  if (!await testFetchLicense()) {
    return false;
  }
  
  // Update
  if (!await testUpdateLicense()) {
    return false;
  }
  
  // Fetch after update
  if (!await testFetchLicense()) {
    return false;
  }
  
  // Delete
  if (!await testDeleteLicense()) {
    return false;
  }
  
  // Fetch after delete
  if (!await testFetchLicense()) {
    return false;
  }
  
  log('\n=== All License Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runLicenseTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
