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
async function runPhoneTests() {
  let createdPhoneId = null;
  
  // Test creating phone
  async function testCreatePhone() {
    try {
      log('Testing phone creation...', LogType.INFO);
      
      const phoneData = {
        phone: '555-123-4567',
        label: 'Main Office',
        f_primary: '0'
        // Let the service add _fkID
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/phones`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(phoneData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);
      createdPhoneId = data.response.data[0].fieldData.__ID;
      log(`Created phone with ID: ${createdPhoneId}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`Phone creation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test fetching phones
  async function testFetchOrganizationPhone() {
    try {
      log('Testing organization phone fetch...', LogType.INFO);
      log(`Organization ID: ${ORG_ID}`, LogType.DEBUG);

      // Fetch phones for the organization
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/phones`, {
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

      // Validate each phone record
      data.forEach((phone, index) => {
        if (!phone.fieldData) {
          throw new Error(`Phone ${index + 1} missing fieldData`);
        }
        
        const required = ['phone', 'label', 'f_primary', '__ID'];
        const missing = required.filter(field => !Object.prototype.hasOwnProperty.call(phone.fieldData, field));
        
        if (missing.length > 0) {
          throw new Error(`Phone ${index + 1} missing required fields: ${missing.join(', ')}`);
        }

        // Validate phone format (basic US format)
        const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
        if (!phoneRegex.test(phone.fieldData.phone)) {
          log(`Warning: Phone ${index + 1} has non-standard phone format`, LogType.WARNING);
        }
      });

      // Log phone information
      log(`Phones found: ${data.length}`, LogType.INFO);
      data.forEach((phone, index) => {
        log(`Phone ${index + 1}:`, LogType.INFO);
        log(`- Phone Number: ${phone.fieldData.phone}`, LogType.INFO);
        log(`- Type: ${phone.fieldData.label}`, LogType.INFO);
        log(`- Primary: ${phone.fieldData.f_primary === '1' ? 'Yes' : 'No'}`, LogType.INFO);
      });

      log('Test completed successfully!', LogType.INFO);
      return true;
    } catch (error) {
      log(`Test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test updating phone
  async function testUpdatePhone() {
    try {
      if (!createdPhoneId) {
        throw new Error('No phone ID available for update');
      }
      
      log('Testing phone update...', LogType.INFO);
      
      const updateData = {
        phone: '555-987-6543',
        label: 'Branch Office'
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/phones/${createdPhoneId}`, {
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
      
      log('Phone updated successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Phone update failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Test deleting phone
  async function testDeletePhone() {
    try {
      if (!createdPhoneId) {
        throw new Error('No phone ID available for deletion');
      }
      
      log('Testing phone deletion...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/phones/${createdPhoneId}`, {
        method: 'DELETE',
        headers: {
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      log('Phone deleted successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Phone deletion failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Run all tests in sequence
  log('\n=== Starting Phone CRUD Tests ===\n', LogType.INFO);
  
  // Create
  if (!await testCreatePhone()) {
    return false;
  }
  
  // Fetch after create
  if (!await testFetchOrganizationPhone()) {
    return false;
  }
  
  // Update
  if (!await testUpdatePhone()) {
    return false;
  }
  
  // Fetch after update
  if (!await testFetchOrganizationPhone()) {
    return false;
  }
  
  // Delete
  if (!await testDeletePhone()) {
    return false;
  }
  
  // Fetch after delete
  if (!await testFetchOrganizationPhone()) {
    return false;
  }
  
  log('\n=== All Phone Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runPhoneTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
