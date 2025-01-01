import { createSlice, createSelector } from '@reduxjs/toolkit';
import { getLicenseKeyAuth } from './authSlice';

// Base Selectors
export const selectAllOrganizations = (state) => state.organization.organizations;

// Memoized Selectors
export const selectOrganizations = createSelector(
  [
    (state) => state.organization.organizations,
    (state) => state.organization.searchQuery,
    (state) => state.organization.sortConfig
  ],
  (organizations, searchQuery, sortConfig) => {
    let filteredOrgs = organizations;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredOrgs = filteredOrgs.filter(org => 
        org.fieldData?.Name?.toLowerCase().includes(query) ||
        org.fieldData?.description?.toLowerCase().includes(query) ||
        org.fieldData?.email?.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    const { field, direction } = sortConfig;
    return [...filteredOrgs].sort((a, b) => {
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

export const selectOrganizationById = createSelector(
  [(state) => state.organization.organizations, (_, id) => id],
  (organizations, id) => organizations.find(org => org.fieldData?.__ID === id)
);

export const selectPendingChangesById = createSelector(
  [(state) => state.organization.pendingChanges, (_, id) => id],
  (pendingChanges, id) => pendingChanges[id] || {}
);

// Simple Selectors
export const selectSelectedOrganization = (state) => state.organization.selectedOrganization;
export const selectSelectedOrganizationId = (state) => state.organization.selectedOrganization?.fieldData?.__ID;
export const selectOrganizationLoading = (state) => state.organization.loading;
export const selectOrganizationError = (state) => state.organization.error;
export const selectOrganizationRefresh = (state) => state.organization.refresh;
export const selectEditMode = (state) => state.organization.editMode;
export const selectNotification = (state) => state.organization.notification;
export const selectValidationErrors = (state) => state.organization.validationErrors;
export const selectSearchQuery = (state) => state.organization.searchQuery;
export const selectSortConfig = (state) => state.organization.sortConfig;

const initialState = {
  organizations: [],
  selectedOrganization: null,
  loading: false,
  error: null,
  refresh: false,
  pendingChanges: {}, // Track modifications before update
  searchQuery: '',
  sortConfig: {
    field: 'Name',
    direction: 'asc'
  },
  editMode: false,
  notification: null,
  validationErrors: {}
};

export const organizationSlice = createSlice({
  name: 'organization',
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
    setRefresh: (state, action) => {
      state.refresh = action.payload;
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
    validateEntireForm: (state) => {
      const errors = {};
      const org = state.selectedOrganization;
      
      // Basic required field validation
      if (!org?.fieldData?.Name?.trim()) {
        errors.Name = 'Organization name is required';
      }
      
      // Email format validation
      if (org?.fieldData?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(org.fieldData.email)) {
        errors.email = 'Invalid email format';
      }
      
      // Phone number format validation (basic example)
      if (org?.fieldData?.phone && !/^\+?[\d\s-]{10,}$/.test(org.fieldData.phone)) {
        errors.phone = 'Invalid phone number format';
      }
      
      // License validation
      if (org?.fieldData?.license && !org.fieldData.license.key) {
        errors.license = 'License key is required';
      }
      
      state.validationErrors = errors;
      return Object.keys(errors).length === 0; // Returns true if validation passed
    },

    // Core CRUD Operations
    setOrganizations: (state, action) => {
      state.organizations = action.payload;
      state.loading = false;
      state.error = null;
    },
    setSelectedOrganization: (state, action) => {
      state.selectedOrganization = action.payload;
      state.loading = false;
      state.error = null;
    },
    addOrganization: (state, action) => {
      state.organizations.push(action.payload);
      state.loading = false;
      state.error = null;
    },
    updateOrganizationInList: (state, action) => {
      const index = state.organizations.findIndex(org => org.fieldData?.__ID === action.payload.fieldData?.__ID);
      if (index !== -1) {
        state.organizations[index] = action.payload;
      }
      if (state.selectedOrganization?.fieldData?.__ID === action.payload.fieldData?.__ID) {
        state.selectedOrganization = action.payload;
      }
      state.loading = false;
      state.error = null;
    },
    removeOrganization: (state, action) => {
      const idToRemove = action.payload;
      state.organizations = state.organizations.filter(org => org.fieldData?.__ID !== idToRemove);
      if (state.selectedOrganization?.fieldData?.__ID === idToRemove) {
        state.selectedOrganization = null;
      }
      state.loading = false;
      state.error = null;
    },

    // Pending Changes Management
    setPendingChange: (state, action) => {
      const { id, field, value } = action.payload;
      if (!state.pendingChanges[id]) {
        state.pendingChanges[id] = {};
      }
      state.pendingChanges[id][field] = value;
    },
    clearPendingChanges: (state, action) => {
      const id = action.payload;
      if (id) {
        delete state.pendingChanges[id];
      } else {
        state.pendingChanges = {};
      }
    },
    // Search and Sort Operations
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setSortConfig: (state, action) => {
      state.sortConfig = action.payload;
    }
  },
});

// Export actions
export const {
  setLoading,
  setError,
  setRefresh,
  clearError,
  toggleEditMode,
  setNotification,
  clearNotification,
  setValidationErrors,
  validateEntireForm,
  setOrganizations,
  setSelectedOrganization,
  addOrganization,
  updateOrganizationInList,
  removeOrganization,
  setPendingChange,
  clearPendingChanges,
  setSearchQuery,
  setSortConfig
} = organizationSlice.actions;

// Action to select an organization - this is a convenience action that wraps setSelectedOrganization
export const selectOrganization = (id) => async (dispatch) => {
  if (!id) {
    dispatch(setSelectedOrganization(null));
    return;
  }
  await dispatch(fetchOrganization(id));
};

// Helper function to get common headers
const getHeaders = (authHeader) => ({
  'Authorization': authHeader,
  'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
});

// Thunk Actions
export const fetchOrganizations = () => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    dispatch(clearError());
    
    const authHeader = getLicenseKeyAuth(getState());
    if (!authHeader) {
      throw new Error('License key auth not available');
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/`, {
      headers: getHeaders(authHeader)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch organizations');
    }
    
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format');
    }
    
    dispatch(setOrganizations(data));
  } catch (error) {
    dispatch(setError(error.message));
    dispatch(setOrganizations([])); // Clear organizations on error
  }
};

export const fetchOrganization = (id) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    
    const authHeader = getLicenseKeyAuth(getState());
    if (!authHeader) {
      throw new Error('License key auth not available');
    }

    // Fetch organization with all its child data
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${id}/children`, {
      headers: getHeaders(authHeader)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch organization');
    }
    
    const data = await response.json();
    dispatch(setSelectedOrganization(data));
    
  } catch (error) {
    dispatch(setError(error.message));
    // Clear selected organization on error
    dispatch(setSelectedOrganization(null));
  }
};

export const createOrganization = (orgData) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    dispatch(clearError());

    // Validate required fields
    if (!orgData.Name?.trim()) {
      throw new Error('Organization name is required');
    }

    const authHeader = getLicenseKeyAuth(getState());
    if (!authHeader) {
      throw new Error('License key auth not available');
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/`, {
      method: 'POST',
      headers: { 
        ...getHeaders(authHeader),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orgData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create organization');
    }

    const data = await response.json();
    dispatch(addOrganization(data));
    dispatch(setNotification({
      message: 'Organization created successfully',
      type: 'success'
    }));
    return data;
  } catch (error) {
    dispatch(setError(error.message));
    dispatch(setNotification({
      message: error.message,
      type: 'error'
    }));
    throw error;
  }
};

export const updateOrganization = (id) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    dispatch(clearError());
    
    const { pendingChanges } = getState().organization;
    const changes = pendingChanges[id];
    
    if (!changes) {
      dispatch(setLoading(false));
      return;
    }

    // Validate required fields
    if (!changes.Name?.trim()) {
      throw new Error('Organization name is required');
    }

    const authHeader = getLicenseKeyAuth(getState());
    if (!authHeader) {
      throw new Error('License key auth not available');
    }

    // Update the organization
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${id}`, {
      method: 'PATCH',
      headers: { 
        ...getHeaders(authHeader),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(changes),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update organization');
    }

    // Fetch fresh data including child records after successful update
    const fullDataResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${id}/children`, {
      headers: getHeaders(authHeader)
    });
    
    if (!fullDataResponse.ok) {
      throw new Error('Failed to fetch updated organization data');
    }
    const fullData = await fullDataResponse.json();
    
    dispatch(updateOrganizationInList(fullData));
    dispatch(clearPendingChanges(id));
    dispatch(setNotification({
      message: 'Organization updated successfully',
      type: 'success'
    }));
    
    return fullData;
  } catch (error) {
    dispatch(setError(error.message));
    dispatch(setNotification({
      message: error.message,
      type: 'error'
    }));
    throw error;
  }
};

export const deleteOrganization = (id) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    dispatch(clearError());

    const authHeader = getLicenseKeyAuth(getState());
    if (!authHeader) {
      throw new Error('License key auth not available');
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${id}`, {
      method: 'DELETE',
      headers: getHeaders(authHeader)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete organization');
    }

    dispatch(removeOrganization(id));
    dispatch(setNotification({
      message: 'Organization deleted successfully',
      type: 'success'
    }));
  } catch (error) {
    dispatch(setError(error.message));
    dispatch(setNotification({
      message: error.message,
      type: 'error'
    }));
    throw error;
  }
};

export default organizationSlice.reducer;
