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
const ORG_ID = process.env.VITE_PUBLIC_KEY;

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
  addressData: {
    streetAddress: '123 Test Street',
    city: 'Toronto',
    prov: 'ON',
    postalCode: 'M5V 2T6',
    country: 'Canada',
    type: 'Main Office',
    unitNumber: ''
  },
  updateData: {
    streetAddress: '456 Updated Street',
    city: 'Vancouver',
    prov: 'BC',
    postalCode: 'V6B 2J4',
    country: 'Canada',
    type: 'Branch Office',
    unitNumber: '2B'
  },
  requiredFields: ['streetAddress', 'city', 'prov', 'postalCode', 'country', 'type', 'unitNumber', '__ID'],
  validProvinces: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
  validAddressTypes: ['Main Office', 'Branch Office', 'Billing', 'Shipping', 'Other'],
  validation: {
    postalCode: /^[A-Z]\d[A-Z] \d[A-Z]\d$/,
    province: /^(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)$/
  }
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

async function runAddressTests() {
  // Check backend health before running tests
  if (!await checkBackendHealth()) {
    return false;
  }

  let createdAddressId = null;
  
  // Test creating address
  async function testCreateAddress() {
    try {
      log('Testing address creation...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/addresses`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(TEST_CONFIG.addressData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);
      createdAddressId = data.response.data[0].fieldData.__ID;
      log(`Created address with ID: ${createdAddressId}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`Address creation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test fetching addresses
  async function testFetchOrganizationAddress() {
    try {
      log('Testing organization address fetch...', LogType.INFO);
      log(`Organization ID: ${ORG_ID}`, LogType.DEBUG);

      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/addresses`, {
        headers: {
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

      if (!Array.isArray(data)) {
        throw new Error('Response data should be an array');
      }

      // Validate each address record
      data.forEach((address, index) => {
        if (!address.fieldData) {
          throw new Error(`Address ${index + 1} missing fieldData`);
        }
        
        const missing = TEST_CONFIG.requiredFields.filter(field => 
          !Object.prototype.hasOwnProperty.call(address.fieldData, field)
        );
        
        if (missing.length > 0) {
          throw new Error(`Address ${index + 1} missing required fields: ${missing.join(', ')}`);
        }

        // Validate postal code format
        if (!TEST_CONFIG.validation.postalCode.test(address.fieldData.postalCode)) {
          log(`Warning: Address ${index + 1} has non-standard postal code format`, LogType.WARNING);
        }

        // Validate province code
        if (!TEST_CONFIG.validation.province.test(address.fieldData.prov)) {
          log(`Warning: Address ${index + 1} has non-standard province format`, LogType.WARNING);
        }

        // Validate address type
        if (!TEST_CONFIG.validAddressTypes.includes(address.fieldData.type)) {
          log(`Warning: Address ${index + 1} has non-standard address type`, LogType.WARNING);
        }
      });

      // Log address information
      log(`Addresses found: ${data.length}`, LogType.INFO);
      data.forEach((address, index) => {
        log(`Address ${index + 1}:`, LogType.INFO);
        log(`- Street Address: ${address.fieldData.streetAddress}`, LogType.INFO);
        log(`- Unit Number: ${address.fieldData.unitNumber}`, LogType.INFO);
        log(`- City: ${address.fieldData.city}`, LogType.INFO);
        log(`- Province: ${address.fieldData.prov}`, LogType.INFO);
        log(`- Postal Code: ${address.fieldData.postalCode}`, LogType.INFO);
        log(`- Country: ${address.fieldData.country}`, LogType.INFO);
        log(`- Type: ${address.fieldData.type}`, LogType.INFO);
      });

      log('Test completed successfully!', LogType.INFO);
      return true;
    } catch (error) {
      log(`Test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test updating address
  async function testUpdateAddress() {
    try {
      if (!createdAddressId) {
        throw new Error('No address ID available for update');
      }
      
      log('Testing address update...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/addresses/${createdAddressId}`, {
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
      
      log('Address updated successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Address update failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Test deleting address
  async function testDeleteAddress() {
    try {
      if (!createdAddressId) {
        throw new Error('No address ID available for deletion');
      }
      
      log('Testing address deletion...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/addresses/${createdAddressId}`, {
        method: 'DELETE',
        headers: {
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      log('Address deleted successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Address deletion failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Run all tests in sequence
  log('\n=== Starting Address CRUD Tests ===\n', LogType.INFO);
  
  // Create
  if (!await testCreateAddress()) {
    return false;
  }
  
  // Fetch after create
  if (!await testFetchOrganizationAddress()) {
    return false;
  }
  
  // Update
  if (!await testUpdateAddress()) {
    return false;
  }
  
  // Fetch after update
  if (!await testFetchOrganizationAddress()) {
    return false;
  }
  
  // Delete
  if (!await testDeleteAddress()) {
    return false;
  }
  
  // Fetch after delete
  if (!await testFetchOrganizationAddress()) {
    return false;
  }
  
  log('\n=== All Address Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runAddressTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
