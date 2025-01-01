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
async function runSellableTests() {
  let createdSellableId = null;
  
  // Test creating sellable
  async function testCreateSellable() {
    try {
      log('Testing sellable creation...', LogType.INFO);
      
      const sellableData = {
        name: 'Test Product',
        description: 'A test product for testing',
        price: '99.99',
        sku: 'TEST-001',
        status: 'active',
        quantity: '100'
        // Let the service add _fkID
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/sellables`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sellableData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);
      createdSellableId = data.response.data[0].fieldData.__ID;
      log(`Created sellable with ID: ${createdSellableId}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`Sellable creation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test fetching sellables
  async function testFetchOrganizationSellable() {
    try {
      log('Testing organization sellable fetch...', LogType.INFO);
      log(`Organization ID: ${ORG_ID}`, LogType.DEBUG);

      // Fetch sellables for the organization
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/sellables`, {
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

      // Validate each sellable record
      data.forEach((sellable, index) => {
        if (!sellable.fieldData) {
          throw new Error(`Sellable ${index + 1} missing fieldData`);
        }
        
        const required = ['name', 'description', 'price', 'sku', 'status', 'quantity', '__ID'];
        const missing = required.filter(field => !Object.prototype.hasOwnProperty.call(sellable.fieldData, field));
        
        if (missing.length > 0) {
          throw new Error(`Sellable ${index + 1} missing required fields: ${missing.join(', ')}`);
        }

        // Validate price format
        const priceRegex = /^\d+(\.\d{1,2})?$/;
        if (!priceRegex.test(sellable.fieldData.price)) {
          log(`Warning: Sellable ${index + 1} has non-standard price format`, LogType.WARNING);
        }

        // Validate quantity is a number
        if (isNaN(sellable.fieldData.quantity)) {
          log(`Warning: Sellable ${index + 1} has invalid quantity format`, LogType.WARNING);
        }
      });

      // Log sellable information
      log(`Sellables found: ${data.length}`, LogType.INFO);
      data.forEach((sellable, index) => {
        log(`Sellable ${index + 1}:`, LogType.INFO);
        log(`- Name: ${sellable.fieldData.name}`, LogType.INFO);
        log(`- Description: ${sellable.fieldData.description}`, LogType.INFO);
        log(`- Price: ${sellable.fieldData.price}`, LogType.INFO);
        log(`- SKU: ${sellable.fieldData.sku}`, LogType.INFO);
        log(`- Status: ${sellable.fieldData.status}`, LogType.INFO);
        log(`- Quantity: ${sellable.fieldData.quantity}`, LogType.INFO);
      });

      log('Test completed successfully!', LogType.INFO);
      return true;
    } catch (error) {
      log(`Test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test updating sellable
  async function testUpdateSellable() {
    try {
      if (!createdSellableId) {
        throw new Error('No sellable ID available for update');
      }
      
      log('Testing sellable update...', LogType.INFO);
      
      const updateData = {
        name: 'Updated Product',
        description: 'An updated test product',
        price: '149.99',
        status: 'inactive',
        quantity: '50'
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/sellables/${createdSellableId}`, {
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
      
      log('Sellable updated successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Sellable update failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Test deleting sellable
  async function testDeleteSellable() {
    try {
      if (!createdSellableId) {
        throw new Error('No sellable ID available for deletion');
      }
      
      log('Testing sellable deletion...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/sellables/${createdSellableId}`, {
        method: 'DELETE',
        headers: {
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      log('Sellable deleted successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Sellable deletion failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Run all tests in sequence
  log('\n=== Starting Sellable CRUD Tests ===\n', LogType.INFO);
  
  // Create
  if (!await testCreateSellable()) {
    return false;
  }
  
  // Fetch after create
  if (!await testFetchOrganizationSellable()) {
    return false;
  }
  
  // Update
  if (!await testUpdateSellable()) {
    return false;
  }
  
  // Fetch after update
  if (!await testFetchOrganizationSellable()) {
    return false;
  }
  
  // Delete
  if (!await testDeleteSellable()) {
    return false;
  }
  
  // Fetch after delete
  if (!await testFetchOrganizationSellable()) {
    return false;
  }
  
  log('\n=== All Sellable Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runSellableTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
