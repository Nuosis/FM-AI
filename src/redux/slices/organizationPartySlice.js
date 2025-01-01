import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  organizationParties: {},  // Keyed by organization ID
  loading: false,
  error: null,
  pendingChanges: {}, // Track modifications before update
  editMode: false,
  notification: null,
  validationErrors: {},
  searchQuery: '',
  sortConfig: {
    field: 'name',
    direction: 'asc'
  }
};

export const organizationPartySlice = createSlice({
  name: 'organizationParty',
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
      const parties = state.organizationParties[organizationId] || [];
      
      parties.forEach((party, index) => {
        if (!errors[index]) errors[index] = {};
        
        // Display name validation
        if (!party.fieldData?.displayName?.trim()) {
          errors[index].displayName = 'Display name is required';
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
    setOrganizationParties: (state, action) => {
      const { organizationId, parties } = action.payload;
      state.organizationParties[organizationId] = parties;
      state.loading = false;
      state.error = null;
    },
    addOrganizationParty: (state, action) => {
      const { organizationId, party } = action.payload;
      if (!state.organizationParties[organizationId]) {
        state.organizationParties[organizationId] = [];
      }
      state.organizationParties[organizationId].push(party);
      state.loading = false;
      state.error = null;
    },
    updateOrganizationParty: (state, action) => {
      const { organizationId, partyId, updatedParty } = action.payload;
      const parties = state.organizationParties[organizationId];
      if (parties) {
        const index = parties.findIndex(party => party.fieldData.__ID === partyId);
        if (index !== -1) {
          parties[index] = { ...parties[index], ...updatedParty };
        }
      }
      state.loading = false;
      state.error = null;
    },
    removeOrganizationParty: (state, action) => {
      const { organizationId, partyId } = action.payload;
      const parties = state.organizationParties[organizationId];
      if (parties) {
        state.organizationParties[organizationId] = parties.filter(
          party => party.fieldData.__ID !== partyId
        );
      }
      state.loading = false;
      state.error = null;
    },

    // Pending Changes Management
    setPendingPartyChange: (state, action) => {
      const { organizationId, partyId, field, value } = action.payload;
      if (!state.pendingChanges[organizationId]) {
        state.pendingChanges[organizationId] = {};
      }
      if (!state.pendingChanges[organizationId][partyId]) {
        state.pendingChanges[organizationId][partyId] = {};
      }
      state.pendingChanges[organizationId][partyId][field] = value;
    },
    clearPendingPartyChanges: (state, action) => {
      const { organizationId, partyId } = action.payload;
      if (partyId) {
        if (state.pendingChanges[organizationId]) {
          delete state.pendingChanges[organizationId][partyId];
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
  setOrganizationParties,
  addOrganizationParty,
  updateOrganizationParty,
  removeOrganizationParty,
  setPendingPartyChange,
  clearPendingPartyChanges,
} = organizationPartySlice.actions;

// Thunk Actions
export const fetchOrganizationParties = (organizationId) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/parties`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      }
    });
    if (!response.ok) throw new Error('Failed to fetch organization parties');
    const data = await response.json();
    dispatch(setOrganizationParties({ organizationId, parties: data }));
  } catch (error) {
    dispatch(setError(error.message));
  }
};

export const createOrganizationParty = (organizationId, partyData) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/parties`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      },
      body: JSON.stringify(partyData),
    });
    if (!response.ok) throw new Error('Failed to create organization party');
    const data = await response.json();
    dispatch(addOrganizationParty({ organizationId, party: data }));
    return data;
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  }
};

export const updateOrganizationPartyRecord = (organizationId, partyId) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const { pendingChanges } = getState().organizationParty;
    const changes = pendingChanges[organizationId]?.[partyId];
    
    if (!changes) {
      dispatch(setLoading(false));
      return;
    }

    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/parties/${partyId}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      },
      body: JSON.stringify(changes),
    });
    if (!response.ok) throw new Error('Failed to update organization party');
    const data = await response.json();
    
    dispatch(updateOrganizationParty({ 
      organizationId, 
      partyId, 
      updatedParty: data 
    }));
    dispatch(clearPendingPartyChanges({ organizationId, partyId }));
    return data;
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  }
};

export const deleteOrganizationParty = (organizationId, partyId) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/parties/${partyId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      },
    });
    if (!response.ok) throw new Error('Failed to delete organization party');
    dispatch(removeOrganizationParty({ organizationId, partyId }));
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  }
};

// Selectors
import { createSelector } from '@reduxjs/toolkit';

const selectAllOrganizationParties = (state) => state.organizationParty.organizationParties;
const selectSearchQueryValue = (state) => state.organizationParty.searchQuery;
const selectSortConfigValue = (state) => state.organizationParty.sortConfig;

// Base selector for parties by organization ID
const selectBaseOrganizationParties = createSelector(
  [selectAllOrganizationParties, (_, organizationId) => organizationId],
  (allParties, organizationId) => allParties[organizationId] || []
);

// Filtered parties
const selectFilteredParties = createSelector(
  [selectBaseOrganizationParties, selectSearchQueryValue],
  (parties, searchQuery) => {
    if (!searchQuery) return parties;
    
    const query = searchQuery.toLowerCase();
    return parties.filter(party => 
      party.fieldData?.displayName?.toLowerCase().includes(query)
    );
  }
);

// Final sorted and filtered parties
export const selectOrganizationParties = createSelector(
  [selectFilteredParties, selectSortConfigValue],
  (parties, sortConfig) => {
    const { direction } = sortConfig;
    return [...parties].sort((a, b) => {
      const aValue = a.fieldData?.displayName || '';
      const bValue = b.fieldData?.displayName || '';
      const comparison = aValue.localeCompare(bValue);
      return direction === 'asc' ? comparison : -comparison;
    });
  }
);

export const selectOrganizationPartyLoading = (state) => state.organizationParty.loading;
export const selectOrganizationPartyError = (state) => state.organizationParty.error;

const selectAllPendingChanges = (state) => state.organizationParty.pendingChanges;

export const selectOrganizationPartyPendingChanges = createSelector(
  [selectAllPendingChanges, (_, organizationId, partyId) => ({ organizationId, partyId })],
  (pendingChanges, { organizationId, partyId }) => 
    pendingChanges[organizationId]?.[partyId] || {}
);

export const selectEditMode = (state) => state.organizationParty.editMode;
export const selectNotification = (state) => state.organizationParty.notification;
export const selectValidationErrors = (state) => state.organizationParty.validationErrors;
export const selectSearchQuery = (state) => state.organizationParty.searchQuery;
export const selectSortConfig = (state) => state.organizationParty.sortConfig;

export default organizationPartySlice.reducer;
