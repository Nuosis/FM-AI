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
async function runPartyTests() {
  let createdPartyId = null;
  
  // Test creating party
  async function testCreateParty() {
    try {
      log('Testing party creation...', LogType.INFO);
      
      const partyData = {
        displayName: 'Test Party Member',
        // Let the service add _orgID
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/parties`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(partyData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);
      createdPartyId = data.response.data[0].fieldData.__ID;
      log(`Created party with ID: ${createdPartyId}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`Party creation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test fetching parties
  async function testFetchOrganizationParty() {
    try {
      log('Testing organization party fetch...', LogType.INFO);
      log(`Organization ID: ${ORG_ID}`, LogType.DEBUG);

      // Fetch parties for the organization
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/parties`, {
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

      // Validate each party record
      data.forEach((party, index) => {
        if (!party.fieldData) {
          throw new Error(`Party ${index + 1} missing fieldData`);
        }
        
        const required = ['displayName', '__ID'];
        const missing = required.filter(field => !Object.prototype.hasOwnProperty.call(party.fieldData, field));
        
        if (missing.length > 0) {
          throw new Error(`Party ${index + 1} missing required fields: ${missing.join(', ')}`);
        }
      });

      // Log party information
      log(`Parties found: ${data.length}`, LogType.INFO);
      data.forEach((party, index) => {
        log(`Party ${index + 1}:`, LogType.INFO);
        log(`- Name: ${party.fieldData.displayName}`, LogType.INFO);
        log(`- ID: ${party.fieldData.__ID}`, LogType.INFO);
      });

      log('Test completed successfully!', LogType.INFO);
      return true;
    } catch (error) {
      log(`Test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test updating party
  async function testUpdateParty() {
    try {
      if (!createdPartyId) {
        throw new Error('No party ID available for update');
      }
      
      log('Testing party update...', LogType.INFO);
      
      const updateData = {
        displayName: 'Updated Test Party Member'
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/parties/${createdPartyId}`, {
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
      
      log('Party updated successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Party update failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Test deleting party
  async function testDeleteParty() {
    try {
      if (!createdPartyId) {
        throw new Error('No party ID available for deletion');
      }
      
      log('Testing party deletion...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/parties/${createdPartyId}`, {
        method: 'DELETE',
        headers: {
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      log('Party deleted successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Party deletion failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Run all tests in sequence
  log('\n=== Starting Party CRUD Tests ===\n', LogType.INFO);
  
  // Create
  if (!await testCreateParty()) {
    return false;
  }
  
  // Fetch after create
  if (!await testFetchOrganizationParty()) {
    return false;
  }
  
  // Update
  if (!await testUpdateParty()) {
    return false;
  }
  
  // Fetch after update
  if (!await testFetchOrganizationParty()) {
    return false;
  }
  
  // Delete
  if (!await testDeleteParty()) {
    return false;
  }
  
  // Fetch after delete
  if (!await testFetchOrganizationParty()) {
    return false;
  }
  
  log('\n=== All Party Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runPartyTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
