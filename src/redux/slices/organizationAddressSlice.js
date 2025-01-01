import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  organizationAddresses: {},  // Keyed by organization ID
  loading: false,
  error: null,
  pendingChanges: {}, // Track modifications before update
  editMode: false,
  notification: null,
  validationErrors: {},
  searchQuery: '',
  sortConfig: {
    field: 'streetAddress',
    direction: 'asc'
  }
};

export const organizationAddressSlice = createSlice({
  name: 'organizationAddress',
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
      const addresses = state.organizationAddresses[organizationId] || [];
      
      addresses.forEach((address, index) => {
        if (!errors[index]) errors[index] = {};
        
        // Street validation
        if (!address.fieldData?.streetAddress?.trim()) {
          errors[index].streetAddress = 'Street address is required';
        }
        
        // City validation
        if (!address.fieldData?.city?.trim()) {
          errors[index].city = 'City is required';
        }
        
        // Province validation
        if (!address.fieldData?.prov?.trim()) {
          errors[index].prov = 'Province is required';
        }
        
        // Postal Code validation
        if (!address.fieldData?.postalCode?.trim()) {
          errors[index].postalCode = 'Postal code is required';
        } else if (!/^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(address.fieldData.postalCode)) { // Canadian format
          errors[index].postalCode = 'Invalid postal code format (should be A1A 1A1)';
        }
        
        // Country validation
        if (!address.fieldData?.country?.trim()) {
          errors[index].country = 'Country is required';
        }
        
        // Type validation
        if (!address.fieldData?.type?.trim()) {
          errors[index].type = 'Address type is required';
        }

        // Unit Number validation (optional)
        if (address.fieldData?.unitNumber && typeof address.fieldData.unitNumber !== 'string') {
          errors[index].unitNumber = 'Unit number must be a string';
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
    setOrganizationAddresses: (state, action) => {
      const { organizationId, addresses } = action.payload;
      state.organizationAddresses[organizationId] = addresses;
      state.loading = false;
      state.error = null;
    },
    addOrganizationAddress: (state, action) => {
      const { organizationId, address } = action.payload;
      if (!state.organizationAddresses[organizationId]) {
        state.organizationAddresses[organizationId] = [];
      }
      state.organizationAddresses[organizationId].push(address);
      state.loading = false;
      state.error = null;
    },
    updateOrganizationAddress: (state, action) => {
      const { organizationId, addressId, updatedAddress } = action.payload;
      const addresses = state.organizationAddresses[organizationId];
      if (addresses) {
        const index = addresses.findIndex(address => address.fieldData.__ID === addressId);
        if (index !== -1) {
          addresses[index] = { ...addresses[index], ...updatedAddress };
        }
      }
      state.loading = false;
      state.error = null;
    },
    removeOrganizationAddress: (state, action) => {
      const { organizationId, addressId } = action.payload;
      const addresses = state.organizationAddresses[organizationId];
      if (addresses) {
        state.organizationAddresses[organizationId] = addresses.filter(
          address => address.fieldData.__ID !== addressId
        );
      }
      state.loading = false;
      state.error = null;
    },

    // Pending Changes Management
    setPendingAddressChange: (state, action) => {
      const { organizationId, addressId, field, value } = action.payload;
      if (!state.pendingChanges[organizationId]) {
        state.pendingChanges[organizationId] = {};
      }
      if (!state.pendingChanges[organizationId][addressId]) {
        state.pendingChanges[organizationId][addressId] = {};
      }
      state.pendingChanges[organizationId][addressId][field] = value;
    },
    clearPendingAddressChanges: (state, action) => {
      const { organizationId, addressId } = action.payload;
      if (addressId) {
        if (state.pendingChanges[organizationId]) {
          delete state.pendingChanges[organizationId][addressId];
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
  setOrganizationAddresses,
  addOrganizationAddress,
  updateOrganizationAddress,
  removeOrganizationAddress,
  setPendingAddressChange,
  clearPendingAddressChanges,
} = organizationAddressSlice.actions;

// Thunk Actions
export const fetchOrganizationAddresses = (organizationId) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/addresses`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      }
    });
    if (!response.ok) throw new Error('Failed to fetch organization addresses');
    const data = await response.json();
    dispatch(setOrganizationAddresses({ organizationId, addresses: data }));
  } catch (error) {
    dispatch(setError(error.message));
  }
};

export const createOrganizationAddress = (organizationId, addressData) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/addresses`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      },
      body: JSON.stringify(addressData),
    });
    if (!response.ok) throw new Error('Failed to create organization address');
    const data = await response.json();
    const address = data.response.data[0];
    dispatch(addOrganizationAddress({ organizationId, address }));
    return address;
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  }
};

export const updateOrganizationAddressRecord = (organizationId, addressId) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const { pendingChanges } = getState().organizationAddress;
    const accessToken = getState().auth.accessToken;
    const changes = pendingChanges[organizationId]?.[addressId];
    
    if (!changes) {
      dispatch(setLoading(false));
      return;
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/addresses/${addressId}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      },
      body: JSON.stringify(changes),
    });
    if (!response.ok) throw new Error('Failed to update organization address');
    const data = await response.json();
    const updatedAddress = data.response.data[0];
    
    dispatch(updateOrganizationAddress({ 
      organizationId, 
      addressId, 
      updatedAddress 
    }));
    dispatch(clearPendingAddressChanges({ organizationId, addressId }));
    return updatedAddress;
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  }
};

export const deleteOrganizationAddress = (organizationId, addressId) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/addresses/${addressId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      }
    });
    if (!response.ok) throw new Error('Failed to delete organization address');
    dispatch(removeOrganizationAddress({ organizationId, addressId }));
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  }
};

// Selectors
import { createSelector } from '@reduxjs/toolkit';

const selectAllOrganizationAddresses = (state) => state.organizationAddress.organizationAddresses;
const selectSearchQueryValue = (state) => state.organizationAddress.searchQuery;
const selectSortConfigValue = (state) => state.organizationAddress.sortConfig;

// Base selector for addresses by organization ID
const selectBaseOrganizationAddresses = createSelector(
  [selectAllOrganizationAddresses, (_, organizationId) => organizationId],
  (allAddresses, organizationId) => allAddresses[organizationId] || []
);

// Filtered addresses
const selectFilteredAddresses = createSelector(
  [selectBaseOrganizationAddresses, selectSearchQueryValue],
  (addresses, searchQuery) => {
    if (!searchQuery) return addresses;
    
    const query = searchQuery.toLowerCase();
    return addresses.filter(address => 
      address.fieldData?.streetAddress?.toLowerCase().includes(query) ||
      address.fieldData?.city?.toLowerCase().includes(query) ||
      address.fieldData?.prov?.toLowerCase().includes(query) ||
      address.fieldData?.postalCode?.toLowerCase().includes(query) ||
      address.fieldData?.country?.toLowerCase().includes(query) ||
      address.fieldData?.type?.toLowerCase().includes(query) ||
      address.fieldData?.unitNumber?.toLowerCase().includes(query)
    );
  }
);

// Final sorted and filtered addresses
export const selectOrganizationAddresses = createSelector(
  [selectFilteredAddresses, selectSortConfigValue],
  (addresses, sortConfig) => {
    const { field, direction } = sortConfig;
    return [...addresses].sort((a, b) => {
      const aValue = a.fieldData?.[field];
      const bValue = b.fieldData?.[field];
      
      if (!aValue) return 1;
      if (!bValue) return -1;
      
      let comparison = 0;
      if (typeof aValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = aValue - bValue;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
  }
);

export const selectOrganizationAddressLoading = (state) => state.organizationAddress.loading;
export const selectOrganizationAddressError = (state) => state.organizationAddress.error;

const selectAllPendingChanges = (state) => state.organizationAddress.pendingChanges;

export const selectOrganizationAddressPendingChanges = createSelector(
  [selectAllPendingChanges, (_, organizationId, addressId) => ({ organizationId, addressId })],
  (pendingChanges, { organizationId, addressId }) => 
    pendingChanges[organizationId]?.[addressId] || {}
);

export const selectEditMode = (state) => state.organizationAddress.editMode;
export const selectNotification = (state) => state.organizationAddress.notification;
export const selectValidationErrors = (state) => state.organizationAddress.validationErrors;
export const selectSearchQuery = (state) => state.organizationAddress.searchQuery;
export const selectSortConfig = (state) => state.organizationAddress.sortConfig;

export default organizationAddressSlice.reducer;
