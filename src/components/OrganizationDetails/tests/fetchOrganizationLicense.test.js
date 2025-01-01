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
async function runLicenseTests() {
  let createdLicenseId = null;
  
  // Test creating license
  async function testCreateLicense() {
    try {
      log('Testing license creation...', LogType.INFO);
      
      const licenseData = {
        dateStart: new Date().toLocaleDateString('en-US'), // MM/DD/YYYY format
        dateEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'), // 1 year from now
        f_active: 1,
        licenseTerm: 12,
        licenseTermUnit: 'Year',
        maxDevices: 5,
        orgName: 'Test Organization',
        userName: 'Test User',
        _partyID: '1A418E40-1C40-4607-9D38-6636E224A4D1',
        _privateKEY: 'H5418E20-1C40-4607-9D38-6636E224A434'
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/licenses`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(licenseData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);
      createdLicenseId = data.response.data[0].fieldData.__ID;
      log(`Created license with ID: ${createdLicenseId}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`License creation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test fetching licenses
  async function testFetchOrganizationLicense() {
    try {
      log('Testing organization license fetch...', LogType.INFO);
      log(`Organization ID: ${ORG_ID}`, LogType.DEBUG);

      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/licenses`, {
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

      // Validate each license record
      data.forEach((license, index) => {
        if (!license.fieldData) {
          throw new Error(`License ${index + 1} missing fieldData`);
        }
        
        const required = ['dateStart', 'dateEnd', 'f_active', 'licenseTerm', 'licenseTermUnit', 'maxDevices', '_partyID', '_privateKEY', '__ID'];
        const missing = required.filter(field => !Object.prototype.hasOwnProperty.call(license.fieldData, field));
        
        if (missing.length > 0) {
          throw new Error(`License ${index + 1} missing required fields: ${missing.join(', ')}`);
        }

        // Validate date formats
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!dateRegex.test(license.fieldData.dateStart)) {
          log(`Warning: License ${index + 1} has invalid start date format`, LogType.WARNING);
        }
        if (!dateRegex.test(license.fieldData.dateEnd)) {
          log(`Warning: License ${index + 1} has invalid end date format`, LogType.WARNING);
        }
      });

      // Log license information
      log(`Licenses found: ${data.length}`, LogType.INFO);
      data.forEach((license, index) => {
        log(`License ${index + 1}:`, LogType.INFO);
        log(`- Start Date: ${license.fieldData.dateStart}`, LogType.INFO);
        log(`- End Date: ${license.fieldData.dateEnd}`, LogType.INFO);
        log(`- Active: ${license.fieldData.f_active === '1' ? 'Yes' : 'No'}`, LogType.INFO);
        log(`- Term: ${license.fieldData.licenseTerm} ${license.fieldData.licenseTermUnit}`, LogType.INFO);
        log(`- Max Devices: ${license.fieldData.maxDevices}`, LogType.INFO);
        if (license.fieldData.orgName) {
          log(`- Organization: ${license.fieldData.orgName}`, LogType.INFO);
        }
        if (license.fieldData.userName) {
          log(`- User: ${license.fieldData.userName}`, LogType.INFO);
        }
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
      
      const updateData = {
        maxDevices: '10',
        userName: 'Updated User'
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/licenses/${createdLicenseId}`, {
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
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/licenses/${createdLicenseId}`, {
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
  if (!await testFetchOrganizationLicense()) {
    return false;
  }
  
  // Update
  if (!await testUpdateLicense()) {
    return false;
  }
  
  // Fetch after update
  if (!await testFetchOrganizationLicense()) {
    return false;
  }
  
  // Delete
  if (!await testDeleteLicense()) {
    return false;
  }
  
  // Fetch after delete
  if (!await testFetchOrganizationLicense()) {
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
