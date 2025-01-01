import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  organizationPhones: {},  // Keyed by organization ID
  loading: false,
  error: null,
  pendingChanges: {}, // Track modifications before update
  editMode: false,
  notification: null,
  validationErrors: {},
  searchQuery: '',
  sortConfig: {
    field: 'phone',
    direction: 'asc'
  }
};

export const organizationPhoneSlice = createSlice({
  name: 'organizationPhone',
  initialState,
  reducers: {
    // State Management
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },

    // Edit Mode Management
    toggleEditMode: (state) => {
      state.editMode = !state.editMode;
    },

    // Notification Management
    setNotification: (state, action) => {
      state.notification = {
        message: action.payload.message,
        type: action.payload.type || 'info',
        timestamp: Date.now()
      };
    },
    clearNotification: (state) => {
      state.notification = null;
    },

    // Validation Management
    setValidationErrors: (state, action) => {
      state.validationErrors = action.payload;
    },
    validateEntireForm: (state, action) => {
      const errors = {};
      const { organizationId } = action.payload;
      const phones = state.organizationPhones[organizationId] || [];
      
      phones.forEach((phone, index) => {
        if (!errors[index]) errors[index] = {};
        
        // Phone number validation
        if (!phone.fieldData?.phone?.trim()) {
          errors[index].phone = 'Phone number is required';
        } else {
          // Basic format: 555-123-4567
          const numberPattern = /^\d{3}-\d{3}-\d{4}$/;
          if (!numberPattern.test(phone.fieldData.phone.trim())) {
            errors[index].phone = 'Invalid phone number format (use: 555-123-4567)';
          }
        }
        
        // Label validation
        if (!phone.fieldData?.label?.trim()) {
          errors[index].label = 'Phone label is required';
        }
        
        // Primary flag validation
        if (!['0', '1'].includes(phone.fieldData?.f_primary)) {
          errors[index].f_primary = 'Primary flag must be set to 0 or 1';
        }
      });
      
      state.validationErrors = errors;
      return Object.keys(errors).length === 0;
    },

    // Search and Sort Operations
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setSortConfig: (state, action) => {
      state.sortConfig = action.payload;
    },

    // CRUD Operations
    setOrganizationPhones: (state, action) => {
      const { organizationId, phones } = action.payload;
      state.organizationPhones[organizationId] = phones;
      state.loading = false;
      state.error = null;
    },
    addOrganizationPhone: (state, action) => {
      const { organizationId, phone } = action.payload;
      if (!state.organizationPhones[organizationId]) {
        state.organizationPhones[organizationId] = [];
      }
      // Ensure we're using the fieldData structure consistently
      state.organizationPhones[organizationId].push({
        fieldData: {
          ...phone.fieldData,
          phone: phone.fieldData.phone,
          label: phone.fieldData.label,
          f_primary: phone.fieldData.f_primary,
          __ID: phone.fieldData.__ID
        }
      });
      state.loading = false;
      state.error = null;
    },
    updateOrganizationPhone: (state, action) => {
      const { organizationId, phoneId, updatedPhone } = action.payload;
      const phones = state.organizationPhones[organizationId];
      if (phones) {
        const index = phones.findIndex(phone => phone.fieldData.__ID === phoneId);
        if (index !== -1) {
          phones[index] = {
            fieldData: {
              ...phones[index].fieldData,
              ...updatedPhone.fieldData,
              __ID: phoneId
            }
          };
        }
      }
      state.loading = false;
      state.error = null;
    },
    removeOrganizationPhone: (state, action) => {
      const { organizationId, phoneId } = action.payload;
      const phones = state.organizationPhones[organizationId];
      if (phones) {
        state.organizationPhones[organizationId] = phones.filter(
          phone => phone.fieldData.__ID !== phoneId
        );
      }
      state.loading = false;
      state.error = null;
    },

    // Pending Changes Management
    setPendingPhoneChange: (state, action) => {
      const { organizationId, phoneId, field, value } = action.payload;
      if (!state.pendingChanges[organizationId]) {
        state.pendingChanges[organizationId] = {};
      }
      if (!state.pendingChanges[organizationId][phoneId]) {
        state.pendingChanges[organizationId][phoneId] = {};
      }
      state.pendingChanges[organizationId][phoneId][field] = value;
    },
    clearPendingPhoneChanges: (state, action) => {
      const { organizationId, phoneId } = action.payload;
      if (phoneId) {
        if (state.pendingChanges[organizationId]) {
          delete state.pendingChanges[organizationId][phoneId];
        }
      } else if (organizationId) {
        delete state.pendingChanges[organizationId];
      } else {
        state.pendingChanges = {};
      }
    },
  },
});

// Export actions
export const {
  setLoading,
  setError,
  clearError,
  toggleEditMode,
  setNotification,
  clearNotification,
  setValidationErrors,
  validateEntireForm,
  setSearchQuery,
  setSortConfig,
  setOrganizationPhones,
  addOrganizationPhone,
  updateOrganizationPhone,
  removeOrganizationPhone,
  setPendingPhoneChange,
  clearPendingPhoneChanges,
} = organizationPhoneSlice.actions;

// Thunk Actions
export const fetchOrganizationPhones = (organizationId) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/phones`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      }
    });
    if (!response.ok) throw new Error('Failed to fetch organization phones');
    const data = await response.json();
    dispatch(setOrganizationPhones({ organizationId, phones: data }));
  } catch (error) {
    dispatch(setError(error.message));
  }
};

export const createOrganizationPhone = (organizationId, phoneData) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/phones`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(phoneData),
    });
    if (!response.ok) throw new Error('Failed to create organization phone');
    const data = await response.json();
    dispatch(addOrganizationPhone({ 
      organizationId, 
      phone: data.response.data[0]
    }));
    return data;
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  }
};

export const updateOrganizationPhoneRecord = (organizationId, phoneId, changes) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/phones/${phoneId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(changes),
    });
    if (!response.ok) throw new Error('Failed to update organization phone');
    const data = await response.json();
    
    // Ensure we're handling the response data structure correctly
    dispatch(updateOrganizationPhone({ 
      organizationId, 
      phoneId, 
      updatedPhone: {
        fieldData: {
          ...changes,
          __ID: phoneId
        }
      }
    }));
    dispatch(clearPendingPhoneChanges({ organizationId, phoneId }));
    return data;
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  }
};

export const deleteOrganizationPhone = (organizationId, phoneId) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/phones/${phoneId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      }
    });
    if (!response.ok) throw new Error('Failed to delete organization phone');
    dispatch(removeOrganizationPhone({ organizationId, phoneId }));
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  }
};

// Selectors
import { createSelector } from '@reduxjs/toolkit';

const selectAllOrganizationPhones = (state) => state.organizationPhone.organizationPhones;
const selectSearchQueryValue = (state) => state.organizationPhone.searchQuery;
const selectSortConfigValue = (state) => state.organizationPhone.sortConfig;

// Base selector for phones by organization ID
const selectBaseOrganizationPhones = createSelector(
  [selectAllOrganizationPhones, (_, organizationId) => organizationId],
  (allPhones, organizationId) => allPhones[organizationId] || []
);

// Filtered phones
const selectFilteredPhones = createSelector(
  [selectBaseOrganizationPhones, selectSearchQueryValue],
  (phones, searchQuery) => {
    if (!searchQuery) return phones;
    
    const query = searchQuery.toLowerCase();
    return phones.filter(phone => 
      phone.fieldData.phone?.toLowerCase().includes(query) ||
      phone.fieldData.label?.toLowerCase().includes(query)
    );
  }
);

// Final sorted and filtered phones
export const selectOrganizationPhones = createSelector(
  [selectFilteredPhones, selectSortConfigValue],
  (phones, sortConfig) => {
    const { field, direction } = sortConfig;
    return [...phones].sort((a, b) => {
      if (!a.fieldData[field]) return 1;
      if (!b.fieldData[field]) return -1;
      
      let comparison = 0;
      if (field === 'f_primary') {
        comparison = (a.fieldData[field] === b.fieldData[field]) ? 0 : a.fieldData[field] === '1' ? -1 : 1;
      } else {
        comparison = a.fieldData[field].localeCompare(b.fieldData[field]);
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
  }
);

export const selectOrganizationPhoneLoading = (state) => state.organizationPhone.loading;
export const selectOrganizationPhoneError = (state) => state.organizationPhone.error;

const selectAllPendingChanges = (state) => state.organizationPhone.pendingChanges;

export const selectOrganizationPhonePendingChanges = createSelector(
  [selectAllPendingChanges, (_, organizationId, phoneId) => ({ organizationId, phoneId })],
  (pendingChanges, { organizationId, phoneId }) => 
    pendingChanges[organizationId]?.[phoneId] || {}
);

export const selectEditMode = (state) => state.organizationPhone.editMode;
export const selectNotification = (state) => state.organizationPhone.notification;
export const selectValidationErrors = (state) => state.organizationPhone.validationErrors;
export const selectSearchQuery = (state) => state.organizationPhone.searchQuery;
export const selectSortConfig = (state) => state.organizationPhone.sortConfig;

export default organizationPhoneSlice.reducer;
