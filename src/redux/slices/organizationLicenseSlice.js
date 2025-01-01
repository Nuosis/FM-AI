import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// AI_NOTE: Following the pattern from other organization slices while implementing CRUD operations shown in test

// Validation function for license form
export const validateEntireForm = (formData) => {
  const errors = {};
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;

  // Required fields
  const requiredFields = ['dateStart', 'dateEnd', 'f_active', 'licenseTerm', 'licenseTermUnit', 'maxDevices', '_partyID'];
  requiredFields.forEach(field => {
    if (!formData[field] && formData[field] !== 0) {
      errors[field] = 'This field is required';
    }
  });

  // Date format validation
  if (formData.dateStart && !dateRegex.test(formData.dateStart)) {
    errors.dateStart = 'Invalid date format. Use MM/DD/YYYY';
  }
  if (formData.dateEnd && !dateRegex.test(formData.dateEnd)) {
    errors.dateEnd = 'Invalid date format. Use MM/DD/YYYY';
  }

  // Numeric fields validation
  if (formData.licenseTerm && isNaN(Number(formData.licenseTerm))) {
    errors.licenseTerm = 'Must be a number';
  }
  if (formData.maxDevices && isNaN(Number(formData.maxDevices))) {
    errors.maxDevices = 'Must be a number';
  }

  // Active flag validation
  if (formData.f_active && ![0, 1, '0', '1'].includes(formData.f_active)) {
    errors.f_active = 'Must be 0 or 1';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

const initialState = {
  organizationLicenses: {}, // Keyed by organization ID
  status: 'idle',
  error: null,
  validationErrors: {}
};

// Create license
export const createOrganizationLicense = createAsyncThunk(
  'organizationLicense/createOrganizationLicense',
  async ({ organizationId, licenseData }, { getState }) => {
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/licenses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      },
      body: JSON.stringify(licenseData)
    });
    if (!response.ok) {
      throw new Error('Failed to create license');
    }
    const data = await response.json();
    console.log('Create License Response:', JSON.stringify(data, null, 2));
    return {
      organizationId,
      license: data.response.data[0].fieldData
    };
  }
);

// Fetch licenses
export const fetchOrganizationLicenses = createAsyncThunk(
  'organizationLicense/fetchOrganizationLicenses',
  async (organizationId, { getState }) => {
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/licenses`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch licenses');
    }
    const data = await response.json();
    console.log('License API Response:', JSON.stringify(data, null, 2));
    
    // Extract and flatten the license data from the response
    const licenses = data.map(license => ({
      ...license.fieldData,
      modulesSelected: license.portalData?.modulesSelected || []
    })) || [];
    
    console.log('Processed Licenses:', JSON.stringify(licenses, null, 2));
    return {
      organizationId,
      licenses
    };
  }
);

// Update license
export const updateOrganizationLicenseRecord = createAsyncThunk(
  'organizationLicense/updateOrganizationLicenseRecord',
  async ({ organizationId, licenseId, updateData }, { getState }) => {
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/licenses/${licenseId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      },
      body: JSON.stringify(updateData)
    });
    if (!response.ok) {
      throw new Error('Failed to update license');
    }
    return { organizationId, licenseId, ...updateData };
  }
);

// Delete license
export const deleteOrganizationLicense = createAsyncThunk(
  'organizationLicense/deleteOrganizationLicense',
  async ({ organizationId, licenseId }, { getState }) => {
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/licenses/${licenseId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      }
    });
    if (!response.ok) {
      throw new Error('Failed to delete license');
    }
    return { organizationId, licenseId };
  }
);

const organizationLicenseSlice = createSlice({
  name: 'organizationLicense',
  initialState,
  reducers: {
    setValidationErrors: (state, action) => {
      state.validationErrors = action.payload;
    },
    clearValidationErrors: (state) => {
      state.validationErrors = {};
    }
  },
  extraReducers: (builder) => {
    // Create license
    builder
      .addCase(createOrganizationLicense.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createOrganizationLicense.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { organizationId, license } = action.payload;
        if (!state.organizationLicenses[organizationId]) {
          state.organizationLicenses[organizationId] = [];
        }
        state.organizationLicenses[organizationId].push(license);
        state.validationErrors = {};
      })
      .addCase(createOrganizationLicense.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })

    // Fetch licenses
    builder
      .addCase(fetchOrganizationLicenses.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchOrganizationLicenses.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { organizationId, licenses } = action.payload;
        console.log('Redux Store Update - OrganizationId:', organizationId);
        console.log('Redux Store Update - Licenses:', JSON.stringify(licenses, null, 2));
        // Ensure licenses is always an array
        state.organizationLicenses[organizationId] = Array.isArray(licenses) ? licenses : [licenses];
        console.log('Updated Redux Store:', JSON.stringify(state.organizationLicenses, null, 2));
      })
      .addCase(fetchOrganizationLicenses.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })

    // Update license
    builder
      .addCase(updateOrganizationLicenseRecord.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateOrganizationLicenseRecord.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { organizationId, licenseId, ...updates } = action.payload;
        const licenses = state.organizationLicenses[organizationId];
        if (licenses) {
          const index = licenses.findIndex(license => license.__ID === licenseId);
          if (index !== -1) {
            licenses[index] = { ...licenses[index], ...updates };
          }
        }
        state.validationErrors = {};
      })
      .addCase(updateOrganizationLicenseRecord.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })

    // Delete license
    builder
      .addCase(deleteOrganizationLicense.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteOrganizationLicense.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { organizationId, licenseId } = action.payload;
        if (state.organizationLicenses[organizationId]) {
          state.organizationLicenses[organizationId] = state.organizationLicenses[organizationId]
            .filter(license => license.__ID !== licenseId);
        }
      })
      .addCase(deleteOrganizationLicense.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  }
});

// Export actions
export const { setValidationErrors, clearValidationErrors } = organizationLicenseSlice.actions;

// Selectors
import { createSelector } from '@reduxjs/toolkit';

const selectAllOrganizationLicenses = (state) => state.organizationLicense.organizationLicenses;

export const selectOrganizationLicenses = createSelector(
  [selectAllOrganizationLicenses, (_, organizationId) => organizationId],
  (allLicenses, organizationId) => allLicenses[organizationId] || []
);

export const selectOrganizationLicenseStatus = (state) => state.organizationLicense.status;
export const selectOrganizationLicenseError = (state) => state.organizationLicense.error;
export const selectValidationErrors = (state) => state.organizationLicense.validationErrors;

export default organizationLicenseSlice.reducer;
