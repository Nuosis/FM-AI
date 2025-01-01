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
async function runEmailTests() {
  let createdEmailId = null;
  
  // Test creating email
  async function testCreateEmail() {
    try {
      log('Testing email creation...', LogType.INFO);
      
      const emailData = {
        email: 'test@serve.com',
        label: 'test',
        f_primary: '0'
        // Let the service add _fkID
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/emails`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      log('Response data: ' + JSON.stringify(data, null, 2), LogType.DEBUG);
      createdEmailId = data.response.data[0].fieldData.__ID;
      log(`Created email with ID: ${createdEmailId}`, LogType.INFO);
      return true;
    } catch (error) {
      log(`Email creation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test fetching emails
  async function testFetchOrganizationEmail() {
    try {
      log('Testing organization email fetch...', LogType.INFO);
    log(`Organization ID: ${ORG_ID}`, LogType.DEBUG);

    // Fetch emails for the organization
    const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/emails`, {
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

    // Validate each email record
    data.forEach((email, index) => {
      if (!email.fieldData) {
        throw new Error(`Email ${index + 1} missing fieldData`);
      }
      
      const required = ['email', 'label', 'f_primary', '__ID'];
      const missing = required.filter(field => !Object.prototype.hasOwnProperty.call(email.fieldData, field));
      
      if (missing.length > 0) {
        throw new Error(`Email ${index + 1} missing required fields: ${missing.join(', ')}`);
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.fieldData.email)) {
        throw new Error(`Email ${index + 1} has invalid email format`);
      }
    });

    // Log email information
    log(`Emails found: ${data.length}`, LogType.INFO);
    data.forEach((email, index) => {
      log(`Email ${index + 1}:`, LogType.INFO);
      log(`- Email Address: ${email.fieldData.email}`, LogType.INFO);
      log(`- Type: ${email.fieldData.label}`, LogType.INFO);
      log(`- Primary: ${email.fieldData.f_primary === '1' ? 'Yes' : 'No'}`, LogType.INFO);
    });

      log('Test completed successfully!', LogType.INFO);
      return true;
    } catch (error) {
      log(`Test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test updating email
  async function testUpdateEmail() {
    try {
      if (!createdEmailId) {
        throw new Error('No email ID available for update');
      }
      
      log('Testing email update...', LogType.INFO);
      
      const updateData = {
        email: 'updated@serve.com',
        label: 'updated'
      };
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/emails/${createdEmailId}`, {
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
      
      log('Email updated successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Email update failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Test deleting email
  async function testDeleteEmail() {
    try {
      if (!createdEmailId) {
        throw new Error('No email ID available for deletion');
      }
      
      log('Testing email deletion...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/organizations/${ORG_ID}/emails/${createdEmailId}`, {
        method: 'DELETE',
        headers: {
          'Origin': FRONTEND_BASE_URL
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      log('Email deleted successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`Email deletion failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }
  
  // Run all tests in sequence
  log('\n=== Starting Email CRUD Tests ===\n', LogType.INFO);
  
  // Create
  if (!await testCreateEmail()) {
    return false;
  }
  
  // Fetch after create
  if (!await testFetchOrganizationEmail()) {
    return false;
  }
  
  // Update
  if (!await testUpdateEmail()) {
    return false;
  }
  
  // Fetch after update
  if (!await testFetchOrganizationEmail()) {
    return false;
  }
  
  // Delete
  if (!await testDeleteEmail()) {
    return false;
  }
  
  // Fetch after delete
  if (!await testFetchOrganizationEmail()) {
    return false;
  }
  
  log('\n=== All Email Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runEmailTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
