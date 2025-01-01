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
async function runRecordDetailsTests() {
  let createdDetailId = null;
  
  // Test creating record detail
  async function testCreateRecordDetail() {
    try {
      log('Testing record detail creation...', LogType.INFO);
      
      const detailData = {
        type: 'GST',
        data: 'Test record detail data',
        // Let the service add _fkID and _orgID
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/record-details`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(detailData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);
      createdDetailId = data.response.data[0].fieldData.__ID;
      log(`Created record detail with ID: ${createdDetailId}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`Record detail creation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test fetching record details
  async function testFetchOrganizationRecordDetails() {
    try {
      log('Testing organization record details fetch...', LogType.INFO);
      log(`Organization ID: ${ORG_ID}`, LogType.DEBUG);

      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/record-details`, {
        headers: {
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);

      // Verify data structure and required fields
      if (!Array.isArray(data)) {
        throw new Error('Response data should be an array');
      }

      // Validate each record detail
      data.forEach((detail, index) => {
        if (!detail.fieldData) {
          throw new Error(`Record detail ${index + 1} missing fieldData`);
        }
        
        const required = ['type', 'data', '__ID'];
        const missing = required.filter(field => !Object.prototype.hasOwnProperty.call(detail.fieldData, field));
        
        if (missing.length > 0) {
          throw new Error(`Record detail ${index + 1} missing required fields: ${missing.join(', ')}`);
        }
      });

      // Log record details information
      log(`Record details found: ${data.length}`, LogType.INFO);
      data.forEach((detail, index) => {
        log(`Record Detail ${index + 1}:`, LogType.INFO);
        log(`- Type: ${detail.fieldData.type}`, LogType.INFO);
        log(`- Data: ${detail.fieldData.data}`, LogType.INFO);
      });

      log('Test completed successfully!', LogType.INFO);
      return true;
    } catch (error) {
      log(`Test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test updating record detail
  async function testUpdateRecordDetail() {
    try {
      if (!createdDetailId) {
        throw new Error('No record detail ID available for update');
      }
      
      log('Testing record detail update...', LogType.INFO);
      
      const updateData = {
        type: 'GST',
        data: 'Updated record detail data'
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/record-details/${createdDetailId}`, {
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
      
      log('Record detail updated successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Record detail update failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Test deleting record detail
  async function testDeleteRecordDetail() {
    try {
      if (!createdDetailId) {
        throw new Error('No record detail ID available for deletion');
      }
      
      log('Testing record detail deletion...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/record-details/${createdDetailId}`, {
        method: 'DELETE',
        headers: {
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      log('Record detail deleted successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Record detail deletion failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Run all tests in sequence
  log('\n=== Starting Record Details CRUD Tests ===\n', LogType.INFO);
  
  // Create
  if (!await testCreateRecordDetail()) {
    return false;
  }
  
  // Fetch after create
  if (!await testFetchOrganizationRecordDetails()) {
    return false;
  }
  
  // Update
  if (!await testUpdateRecordDetail()) {
    return false;
  }
  
  // Fetch after update
  if (!await testFetchOrganizationRecordDetails()) {
    return false;
  }
  
  // Delete
  if (!await testDeleteRecordDetail()) {
    return false;
  }
  
  // Fetch after delete
  if (!await testFetchOrganizationRecordDetails()) {
    return false;
  }
  
  log('\n=== All Record Details Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runRecordDetailsTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
