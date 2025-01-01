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
const TEST_LICENSE_ID = process.env.VITE_TEST_LICENSE_ID;
const TEST_MODULE_ID = process.env.VITE_TEST_MODULE_ID;

// Log environment variables for debugging
console.log('Environment variables loaded:', {
  API_BASE_URL,
  FRONTEND_BASE_URL,
  ORG_ID,
  TEST_LICENSE_ID,
  TEST_MODULE_ID
});

if (!API_BASE_URL || !FRONTEND_BASE_URL || !ORG_ID || !TEST_LICENSE_ID || !TEST_MODULE_ID) {
  throw new Error('Required environment variables are not set');
}

// Test configuration
const TEST_CONFIG = {
  moduleData: {
    _licenseID: TEST_LICENSE_ID,
    _moduleID: TEST_MODULE_ID,
    _orgID: ORG_ID,
    accessLevel: 'full',
    dateStart: '2024-01-01',
    dateEnd: '2024-12-31',
    price: '100.00',
    priceScheme: 'monthly',
    f_taxGST: "1"
  },
  updateData: {
    accessLevel: 'admin',
    dateEnd: '2024-12-31',
    price: '150.00'
  },
  requiredFields: ['_licenseID', '_moduleID', '_orgID', 'accessLevel', 'dateStart', 'dateEnd'],
  validAccessLevels: ['full', 'admin', 'limited', 'read'],
  validPriceSchemes: ['monthly', 'yearly', 'one-time']
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

async function runModuleSelectedTests() {
  // Check backend health before running tests
  if (!await checkBackendHealth()) {
    return false;
  }

  let createdRecordId = null;
  
  // Test creating module selection
  async function testCreateModuleSelection() {
    try {
      log('Testing module selection creation...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/module-selections/`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(TEST_CONFIG.moduleData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      log('Response data: ' + JSON.stringify(responseData, null, 2), LogType.DEBUG);
      
      createdRecordId = responseData.response.data[0].recordId;
      log(`Created module selection with ID: ${createdRecordId}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`Module selection creation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test fetching module selections by license
  async function testFetchModuleSelections() {
    try {
      log('Testing module selections fetch...', LogType.INFO);
      log(`License ID: ${TEST_CONFIG.moduleData._licenseID}`, LogType.DEBUG);

      const response = await fetch(`${API_BASE_URL}/api/admin/module-selections/license/${TEST_CONFIG.moduleData._licenseID}`, {
        headers: {
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      log('Response data: ' + JSON.stringify(responseData, null, 2), LogType.DEBUG);

      // Validate each module selection record
      responseData.forEach((selection, index) => {
        const missing = TEST_CONFIG.requiredFields.filter(field => 
          !Object.prototype.hasOwnProperty.call(selection.fieldData, field)
        );
        
        if (missing.length > 0) {
          throw new Error(`Module selection ${index + 1} missing required fields: ${missing.join(', ')}`);
        }

        // Validate date formats
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!dateRegex.test(selection.fieldData.dateStart) || !dateRegex.test(selection.fieldData.dateEnd)) {
          log(`Warning: Module selection ${index + 1} has non-standard date format`, LogType.WARNING);
        }

        // Validate access level
        if (!TEST_CONFIG.validAccessLevels.includes(selection.fieldData.accessLevel)) {
          log(`Warning: Module selection ${index + 1} has non-standard access level`, LogType.WARNING);
        }

        // Validate price scheme if present
        if (selection.fieldData.priceScheme && 
            !TEST_CONFIG.validPriceSchemes.includes(selection.fieldData.priceScheme)) {
          log(`Warning: Module selection ${index + 1} has non-standard price scheme`, LogType.WARNING);
        }
      });

      log(`Module selections found: ${responseData.length}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`Test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test updating module selection
  async function testUpdateModuleSelection() {
    try {
      if (!createdRecordId) {
        throw new Error('No record ID available for update');
      }
      
      log('Testing module selection update...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/module-selections/${createdRecordId}`, {
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
      
      log('Module selection updated successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Module selection update failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Test deleting module selection
  async function testDeleteModuleSelection() {
    try {
      if (!createdRecordId) {
        throw new Error('No record ID available for deletion');
      }
      
      log('Testing module selection deletion...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/module-selections/${createdRecordId}`, {
        method: 'DELETE',
        headers: {
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      log('Module selection deleted successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Module selection deletion failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Run all tests in sequence
  log('\n=== Starting Module Selection CRUD Tests ===\n', LogType.INFO);
  
  // Create
  if (!await testCreateModuleSelection()) {
    return false;
  }
  
  // Fetch after create
  if (!await testFetchModuleSelections()) {
    return false;
  }
  
  // Update
  if (!await testUpdateModuleSelection()) {
    return false;
  }
  
  // Fetch after update
  if (!await testFetchModuleSelections()) {
    return false;
  }
  
  // Delete
  if (!await testDeleteModuleSelection()) {
    return false;
  }
  
  // Fetch after delete
  if (!await testFetchModuleSelections()) {
    return false;
  }
  
  log('\n=== All Module Selection Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runModuleSelectedTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
