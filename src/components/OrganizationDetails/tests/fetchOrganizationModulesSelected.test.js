/* global process */
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

// Test configuration and environment validation
const API_BASE_URL = process.env.VITE_API_BASE_URL;
const FRONTEND_BASE_URL = process.env.VITE_FRONTEND_BASE_URL;
const ORG_ID = process.env.VITE_PUBLIC_KEY;

// Test functions
async function runModulesSelectedTests() {
  let createdModuleSelectedId = null;
  
  // Test creating module selected
  async function testCreateModuleSelected() {
    try {
      log('Testing module selected creation...', LogType.INFO);
      
      const moduleSelectedData = {
        _moduleID: 'MOD001', // Example module ID
        _licenseID: 'LIC001', // Example license ID
        // _orgID will be added by the service
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/modules-selected`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(moduleSelectedData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);
      createdModuleSelectedId = data.response.data[0].fieldData.__ID;
      log(`Created module selected with ID: ${createdModuleSelectedId}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`Module selected creation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test fetching modules selected
  async function testFetchOrganizationModulesSelected() {
    try {
      log('Testing organization modules selected fetch...', LogType.INFO);
      log(`Organization ID: ${ORG_ID}`, LogType.DEBUG);

      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/modules-selected`, {
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

      // Validate each module selected record
      data.forEach((moduleSelected, index) => {
        if (!moduleSelected.fieldData) {
          throw new Error(`Module selected ${index + 1} missing fieldData`);
        }
        
        const required = ['_moduleID', '_licenseID', '_orgID', '__ID'];
        const missing = required.filter(field => !Object.prototype.hasOwnProperty.call(moduleSelected.fieldData, field));
        
        if (missing.length > 0) {
          throw new Error(`Module selected ${index + 1} missing required fields: ${missing.join(', ')}`);
        }
      });

      // Log modules selected information
      log(`Modules selected found: ${data.length}`, LogType.INFO);
      data.forEach((moduleSelected, index) => {
        log(`Module Selected ${index + 1}:`, LogType.INFO);
        log(`- Module ID: ${moduleSelected.fieldData._moduleID}`, LogType.INFO);
        log(`- License ID: ${moduleSelected.fieldData._licenseID}`, LogType.INFO);
        log(`- Organization ID: ${moduleSelected.fieldData._orgID}`, LogType.INFO);
      });

      log('Test completed successfully!', LogType.INFO);
      return true;
    } catch (error) {
      log(`Test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test updating module selected
  async function testUpdateModuleSelected() {
    try {
      if (!createdModuleSelectedId) {
        throw new Error('No module selected ID available for update');
      }
      
      log('Testing module selected update...', LogType.INFO);
      
      const updateData = {
        _moduleID: 'MOD002', // Updated module ID
        _licenseID: 'LIC002'  // Updated license ID
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/modules-selected/${createdModuleSelectedId}`, {
        method: 'PATCH',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      log('Module selected updated successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Module selected update failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Test deleting module selected
  async function testDeleteModuleSelected() {
    try {
      if (!createdModuleSelectedId) {
        throw new Error('No module selected ID available for deletion');
      }
      
      log('Testing module selected deletion...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/modules-selected/${createdModuleSelectedId}`, {
        method: 'DELETE',
        headers: {
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      log('Module selected deleted successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Module selected deletion failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Run all tests in sequence
  log('\n=== Starting Modules Selected CRUD Tests ===\n', LogType.INFO);
  
  // Create
  if (!await testCreateModuleSelected()) {
    return false;
  }
  
  // Fetch after create
  if (!await testFetchOrganizationModulesSelected()) {
    return false;
  }
  
  // Update
  if (!await testUpdateModuleSelected()) {
    return false;
  }
  
  // Fetch after update
  if (!await testFetchOrganizationModulesSelected()) {
    return false;
  }
  
  // Delete
  if (!await testDeleteModuleSelected()) {
    return false;
  }
  
  // Fetch after delete
  if (!await testFetchOrganizationModulesSelected()) {
    return false;
  }
  
  log('\n=== All Modules Selected Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runModulesSelectedTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
