/* global process */
import fetch from 'node-fetch';
import { Buffer } from 'buffer';
import dotenv from 'dotenv';

// Load environment variables from root .env
dotenv.config();

// Define log types
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

const API_BASE_URL = process.env.VITE_API_BASE_URL;
const FRONTEND_BASE_URL = process.env.VITE_FRONTEND_BASE_URL;
const PUBLIC_KEY = process.env.VITE_PUBLIC_KEY;
const API_JWT = process.env.VITE_API_JWT;
const API_KEY = process.env.VITE_API_KEY;

if (!API_BASE_URL || !FRONTEND_BASE_URL || !PUBLIC_KEY || !API_JWT || !API_KEY) {
  throw new Error('Required environment variables are not set');
}

// API key credentials for machine-to-machine auth
const API_CREDENTIALS = {
  jwt: API_JWT,
  privateKey: API_KEY
};

// Helper function to encode credentials for login verification
const encodeCredentials = (username, password) => {
  return Buffer.from(`${username}:${password}`).toString('base64');
};

async function runUserRegistrationTests() {

  // Check if email exists for organization
  async function checkEmailExists(email, orgId) {
    try {
      log(`Checking if email ${email} exists for org ${orgId}...`, LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/email/find`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${API_CREDENTIALS.jwt}:${API_CREDENTIALS.privateKey}`
        },
        body: JSON.stringify({
          email,
          _orgID: orgId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const emailResponse = await response.json();
      // Ensure the response object has the expected structure
      if (!emailResponse || !emailResponse.data) {
        log(`Unexpected response structure: ${JSON.stringify(emailResponse)}`, LogType.ERROR);
        throw new Error("Invalid response format from email service.");
      }
      const data = emailResponse.data

      // log(`Email response...${JSON.stringify(data)}`, LogType.DEBUG);
      // Check if data is an array before accessing properties
      if (Array.isArray(data) && data.length > 0) {
        const partyID = data[0]?.fieldData._fkID;

        // Validate that partyID exists and is of the expected type
        if (partyID) {
            log(`Located partyID via Email`, LogType.DEBUG);
            return partyID;
        } else {
            log(`Missing or invalid partyID in response data: ${JSON.stringify(data[0])}`, LogType.WARNING);
            return null;
        }
      } else {
          log("No records found for the provided email.", LogType.INFO);
          return null;
      }                               
    } catch (error) {
      log(`Email check failed: ${error.message}`, LogType.ERROR);
      throw error;
    }
  }

  // Create new party with form data
  async function createParty(formData) {
    try {
      log('Creating new party...', LogType.INFO);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/party`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${API_CREDENTIALS.jwt}:${API_CREDENTIALS.privateKey}`
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          displayName: formData.displayName,
          _orgID: formData._orgID
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      const partyID = responseData.response.data[0].fieldData.__ID;
      
      // Create email for new party
      const emailResponse = await fetch(`${API_BASE_URL}/api/admin/email`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${API_CREDENTIALS.jwt}:${API_CREDENTIALS.privateKey}`
        },
        body: JSON.stringify({
          email: formData.email,
          _fkID: partyID,
          _orgID: formData._orgID
        })
      });

      if (!emailResponse.ok) {
        throw new Error(`Failed to create email for party: ${emailResponse.status}`);
      }

      return partyID;
    } catch (error) {
      log(`Party creation failed: ${error.message}`, LogType.ERROR);
      throw error;
    }
  }

  // Test successful user registration
  async function testSuccessfulRegistration() {
    try {
      log('Testing successful user registration...', LogType.INFO);
      
      // Simulate form data submission
      const formData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        displayName: 'John Doe',
        userName: 'john.doe',
        password: 'Password123!',
        _orgID: PUBLIC_KEY,
        f_active: 1,
        role: 'user'
      };

      // Check if email exists
      let partyID = await checkEmailExists(formData.email, formData._orgID);
      
      // If email doesn't exist, create new party
      if (!partyID) {
        log(`Creating Party for User`, LogType.INFO);
        partyID = await createParty(formData);
      }

      // Proceed with user registration includes check for if user exists
      const userData = {
        userName: formData.userName,
        password: formData.password,
        _orgID: formData._orgID,
        _partyID: partyID,
        active_status: formData.f_active ? 'active' : 'inactive'
      };

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${API_CREDENTIALS.jwt}:${API_CREDENTIALS.privateKey}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      log(`User created`, LogType.INFO);


      // Verify the new user can login
      const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `Basic ${encodeCredentials(formData.userName, formData.password)}`
        },
        body: JSON.stringify({ org_id: PUBLIC_KEY })
      });

      if (!loginResponse.ok) {
        log(`loginResponse ${JSON.stringify({loginResponse})}`, LogType.DEBUG);
        throw new Error('New user unable to login');
      }

      log('User registration successful', LogType.INFO);
      return true;
    } catch (error) {
      log(`User registration failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test registration with invalid data
  async function testInvalidRegistration() {
    try {
      log('Testing registration with invalid data...', LogType.INFO);
      
      // Test case 1: Invalid email format
      const invalidEmailData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid.email', // Invalid email format
        displayName: 'John Doe',
        userName: 'john.doe',
        password: 'Password123!',
        _orgID: PUBLIC_KEY,
        f_active: 1,
        role: 'user'
      };

      let response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${API_CREDENTIALS.jwt}:${API_CREDENTIALS.privateKey}`
        },
        body: JSON.stringify(invalidEmailData)
      });

      if (response.ok) {
        throw new Error('Invalid email registration should have failed but succeeded');
      }
      log('Invalid email test passed (registration was rejected as expected)', LogType.INFO);

      // Test case 2: Missing required fields
      const missingFieldsData = {
        username: 'john.doe',
        password: 'Password123!',
        _orgID: PUBLIC_KEY
      };

      response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${API_CREDENTIALS.jwt}:${API_CREDENTIALS.privateKey}`
        },
        body: JSON.stringify(missingFieldsData)
      });

      if (response.ok) {
        throw new Error('Missing fields registration should have failed but succeeded');
      }
      log('Missing fields test passed (registration was rejected as expected)', LogType.INFO);

      // Test case 3: Duplicate email
      const duplicateEmailData = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'john.doe@example.com', // Same as successful registration
        displayName: 'Jane Doe',
        userName: 'jane.doe',
        password: 'Password123!',
        _orgID: PUBLIC_KEY,
        f_active: 1,
        role: 'user'
      };

      // First check if email exists
      const partyID = await checkEmailExists(duplicateEmailData.email, duplicateEmailData._orgID);
      if (partyID) {
        // Attempt to register with existing email
        response = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Origin': FRONTEND_BASE_URL,
            'Content-Type': 'application/json',
            'Authorization': `ApiKey ${API_CREDENTIALS.jwt}:${API_CREDENTIALS.privateKey}`
          },
          body: JSON.stringify({ ...duplicateEmailData, _partyID: partyID })
        });

        if (response.ok) {
          throw new Error('Duplicate email registration should have failed but succeeded');
        }
        log('Duplicate email test passed (registration was rejected as expected)', LogType.INFO);
      }

      return true;
    } catch (error) {
      log(`Invalid registration test failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test registration without admin token
  async function testUnauthorizedRegistration() {
    try {
      log('Testing unauthorized registration...', LogType.INFO);

      const userData = {
        userName: 'another.test.user',
        password: 'Password123!',
        _orgID: PUBLIC_KEY,
        f_active: 1
      };

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Origin': FRONTEND_BASE_URL,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        throw new Error('Unauthorized registration should have failed but succeeded');
      }

      log('Unauthorized registration test passed (registration was rejected as expected)', LogType.INFO);
      return true;
    } catch (error) {
      if (error.message === 'Unauthorized registration should have failed but succeeded') {
        log(error.message, LogType.ERROR);
        return false;
      }
      log('Unauthorized registration test passed (registration was rejected as expected)', LogType.INFO);
      return true;
    }
  }

  // Run all tests in sequence
  log('\n=== Starting User Registration Tests ===\n', LogType.INFO);

  // Registration tests
  if (!await testSuccessfulRegistration()) return false;
  if (!await testInvalidRegistration()) return false;
  if (!await testUnauthorizedRegistration()) return false;

  log('\n=== All User Registration Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runUserRegistrationTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
