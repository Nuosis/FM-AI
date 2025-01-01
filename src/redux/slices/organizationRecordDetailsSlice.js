import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const fetchOrganizationRecordDetails = createAsyncThunk(
  'organizationRecordDetails/fetchOrganizationRecordDetails',
  async (organizationId, { getState }) => {
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/record-details`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch record details');
    }
    const data = await response.json();
    return data;
  }
);

export const createOrganizationRecordDetail = createAsyncThunk(
  'organizationRecordDetails/createOrganizationRecordDetail',
  async ({ organizationId, detailData }, { getState }) => {
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/record-details`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(detailData)
    });
    if (!response.ok) {
      throw new Error('Failed to create record detail');
    }
    const data = await response.json();
    return data.response.data[0];
  }
);

export const updateOrganizationRecordDetail = createAsyncThunk(
  'organizationRecordDetails/updateOrganizationRecordDetail',
  async ({ organizationId, detailId, updateData }, { getState }) => {
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/record-details/${detailId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    if (!response.ok) {
      throw new Error('Failed to update record detail');
    }
    await response.json();
    return { detailId, ...updateData };
  }
);

export const deleteOrganizationRecordDetail = createAsyncThunk(
  'organizationRecordDetails/deleteOrganizationRecordDetail',
  async ({ organizationId, detailId }, { getState }) => {
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/record-details/${detailId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      }
    });
    if (!response.ok) {
      throw new Error('Failed to delete record detail');
    }
    return detailId;
  }
);

const initialState = {
  recordDetails: [],
  status: 'idle',
  error: null,
  validationErrors: {}
};

const organizationRecordDetailsSlice = createSlice({
  name: 'organizationRecordDetails',
  initialState,
  reducers: {
    clearRecordDetails: (state) => {
      state.recordDetails = [];
      state.status = 'idle';
      state.error = null;
    },
    setPendingRecordDetailsChange: (state, action) => {
      const { detailId, changes } = action.payload;
      const index = state.recordDetails.findIndex(detail => detail.fieldData.__ID === detailId);
      if (index !== -1) {
        state.recordDetails[index].fieldData = {
          ...state.recordDetails[index].fieldData,
          ...changes
        };
      }
    },
    validateEntireForm: (state) => {
      const errors = {};
      state.recordDetails.forEach(detail => {
        if (!detail.fieldData.type || !detail.fieldData.data) {
          errors.general = 'Type and data are required for all record details';
        }
      });
      state.validationErrors = errors;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch cases
      .addCase(fetchOrganizationRecordDetails.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchOrganizationRecordDetails.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.recordDetails = action.payload;
        state.error = null;
        state.validationErrors = {};
      })
      .addCase(fetchOrganizationRecordDetails.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
        state.validationErrors = { general: action.error.message };
      })
      // Create cases
      .addCase(createOrganizationRecordDetail.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createOrganizationRecordDetail.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.recordDetails.push(action.payload);
        state.error = null;
        state.validationErrors = {};
      })
      .addCase(createOrganizationRecordDetail.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
        state.validationErrors = { general: action.error.message };
      })
      // Update cases
      .addCase(updateOrganizationRecordDetail.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateOrganizationRecordDetail.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const index = state.recordDetails.findIndex(detail => detail.fieldData.__ID === action.payload.detailId);
        if (index !== -1) {
          state.recordDetails[index].fieldData = {
            ...state.recordDetails[index].fieldData,
            ...action.payload
          };
        }
        state.error = null;
        state.validationErrors = {};
      })
      .addCase(updateOrganizationRecordDetail.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
        state.validationErrors = { general: action.error.message };
      })
      // Delete cases
      .addCase(deleteOrganizationRecordDetail.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteOrganizationRecordDetail.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.recordDetails = state.recordDetails.filter(
          detail => detail.fieldData.__ID !== action.payload
        );
        state.error = null;
        state.validationErrors = {};
      })
      .addCase(deleteOrganizationRecordDetail.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
        state.validationErrors = { general: action.error.message };
      });
  }
});

export const { clearRecordDetails, setPendingRecordDetailsChange, validateEntireForm } = organizationRecordDetailsSlice.actions;

// Selectors
import { createSelector } from '@reduxjs/toolkit';

const selectAllRecordDetails = (state) => state.organizationRecordDetails.recordDetails;

export const selectOrganizationRecordDetails = createSelector(
  [selectAllRecordDetails, (_, organizationId) => organizationId],
  (recordDetails) => 
    recordDetails.map(detail => ({
      type: detail.fieldData.type,
      data: detail.fieldData.data
    }))
);

export const selectValidationErrors = (state) => state.organizationRecordDetails.validationErrors;

export default organizationRecordDetailsSlice.reducer;
