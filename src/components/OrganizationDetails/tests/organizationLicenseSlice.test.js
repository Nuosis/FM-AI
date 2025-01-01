/* global process */
import { configureStore } from '@reduxjs/toolkit';
import organizationLicenseReducer, {
  createOrganizationLicense,
  fetchOrganizationLicenses,
  updateOrganizationLicenseRecord,
  deleteOrganizationLicense,
  selectOrganizationLicenses,
  selectOrganizationLicenseStatus,
  selectOrganizationLicenseError
} from '../../../redux/slices/organizationLicenseSlice.js';

import dotenv from 'dotenv';

// Load environment variables
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

// Test configuration and environment validation
const ORG_ID = process.env.PUBLIC_KEY;

// Create a test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      organizationLicense: organizationLicenseReducer
    }
  });
};

// Test functions
async function runReduxLicenseTests() {
  const store = createTestStore();
  let createdLicenseId = null;

  // Test creating license
  async function testCreateLicense() {
    try {
      log('Testing license creation with Redux...', LogType.INFO);
      
      const licenseData = {
        dateStart: new Date().toLocaleDateString('en-US'),
        dateEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
        f_active: 1,
        licenseTerm: 12,
        licenseTermUnit: 'Year',
        maxDevices: 5,
        orgName: 'Test Organization',
        userName: 'Test User',
        _partyID: '1A418E40-1C40-4607-9D38-6636E224A4D1',
        _privateKEY: 'H5418E20-1C40-4607-9D38-6636E224A434'
      };

      const result = await store.dispatch(createOrganizationLicense({
        organizationId: ORG_ID,
        licenseData
      }));

      if (result.error) {
        throw new Error(result.error.message);
      }

      createdLicenseId = result.payload.license.__ID;
      log(`Created license with ID: ${createdLicenseId}`, LogType.INFO);

      // Verify store state
      const state = store.getState();
      const status = selectOrganizationLicenseStatus(state);
      const error = selectOrganizationLicenseError(state);
      
      if (status !== 'succeeded' || error) {
        throw new Error(`Failed to create license. Status: ${status}, Error: ${error}`);
      }

      return true;
    } catch (error) {
      log(`License creation failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test fetching licenses
  async function testFetchLicenses() {
    try {
      log('Testing license fetch with Redux...', LogType.INFO);
      
      const result = await store.dispatch(fetchOrganizationLicenses(ORG_ID));
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      // Verify store state
      const state = store.getState();
      const licenses = selectOrganizationLicenses(state, ORG_ID);
      const status = selectOrganizationLicenseStatus(state);
      const error = selectOrganizationLicenseError(state);

      if (status !== 'succeeded' || error) {
        throw new Error(`Failed to fetch licenses. Status: ${status}, Error: ${error}`);
      }

      // Log license information
      log(`Licenses found: ${licenses.length}`, LogType.INFO);
      licenses.forEach((license, index) => {
        log(`License ${index + 1}:`, LogType.INFO);
        log(`- Start Date: ${license.dateStart}`, LogType.INFO);
        log(`- End Date: ${license.dateEnd}`, LogType.INFO);
        log(`- Active: ${license.f_active === '1' ? 'Yes' : 'No'}`, LogType.INFO);
        log(`- Term: ${license.licenseTerm} ${license.licenseTermUnit}`, LogType.INFO);
        log(`- Max Devices: ${license.maxDevices}`, LogType.INFO);
        if (license.orgName) {
          log(`- Organization: ${license.orgName}`, LogType.INFO);
        }
        if (license.userName) {
          log(`- User: ${license.userName}`, LogType.INFO);
        }
      });

      return true;
    } catch (error) {
      log(`License fetch failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Test updating license
  async function testUpdateLicense() {
    try {
      if (!createdLicenseId) {
        throw new Error('No license ID available for update');
      }

      log('Testing license update with Redux...', LogType.INFO);
      
      const updateData = {
        maxDevices: '10',
        userName: 'Updated User'
      };

      const result = await store.dispatch(updateOrganizationLicenseRecord({
        organizationId: ORG_ID,
        licenseId: createdLicenseId,
        updateData
      }));

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Verify store state
      const state = store.getState();
      const status = selectOrganizationLicenseStatus(state);
      const error = selectOrganizationLicenseError(state);

      if (status !== 'succeeded' || error) {
        throw new Error(`Failed to update license. Status: ${status}, Error: ${error}`);
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

      log('Testing license deletion with Redux...', LogType.INFO);
      
      const result = await store.dispatch(deleteOrganizationLicense({
        organizationId: ORG_ID,
        licenseId: createdLicenseId
      }));

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Verify store state
      const state = store.getState();
      const status = selectOrganizationLicenseStatus(state);
      const error = selectOrganizationLicenseError(state);

      if (status !== 'succeeded' || error) {
        throw new Error(`Failed to delete license. Status: ${status}, Error: ${error}`);
      }

      log('License deleted successfully', LogType.INFO);
      return true;
    } catch (error) {
      log(`License deletion failed: ${error.message}`, LogType.ERROR);
      return false;
    }
  }

  // Run all tests in sequence
  log('\n=== Starting Redux License CRUD Tests ===\n', LogType.INFO);
  
  // Create
  if (!await testCreateLicense()) {
    return false;
  }
  
  // Fetch after create
  if (!await testFetchLicenses()) {
    return false;
  }
  
  // Update
  if (!await testUpdateLicense()) {
    return false;
  }
  
  // Fetch after update
  if (!await testFetchLicenses()) {
    return false;
  }
  
  // Delete
  if (!await testDeleteLicense()) {
    return false;
  }
  
  // Fetch after delete
  if (!await testFetchLicenses()) {
    return false;
  }
  
  log('\n=== All Redux License Tests Completed Successfully ===\n', LogType.INFO);
  return true;
}

// Run the tests
runReduxLicenseTests().then(success => {
  if (!success) {
    process.exit(1);
  }
});
