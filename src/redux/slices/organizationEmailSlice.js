import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  organizationEmails: {},  // Keyed by organization ID
  loading: false,
  error: null,
  pendingChanges: {},
  editMode: false,
  notification: null,
  validationErrors: {}
};

export const organizationEmailSlice = createSlice({
  name: 'organizationEmail',
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
      const emails = state.organizationEmails[organizationId] || [];
      
      emails.forEach((email, index) => {
        if (!errors[index]) errors[index] = {};
        
        // Email validation
        if (!email.fieldData?.email?.trim()) {
          errors[index].email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.fieldData.email)) {
          errors[index].email = 'Invalid email format';
        }
        
        // Label validation
        if (!email.fieldData?.label?.trim()) {
          errors[index].label = 'Label is required';
        }
        
        // Primary flag validation
        if (!['0', '1'].includes(email.fieldData?.f_primary)) {
          errors[index].f_primary = 'Primary flag must be set to 0 or 1';
        }
      });
      
      state.validationErrors = errors;
      return Object.keys(errors).length === 0;
    },

    // CRUD Operations
    setOrganizationEmails: (state, action) => {
      const { organizationId, emails } = action.payload;
      state.organizationEmails[organizationId] = emails;
      state.loading = false;
      state.error = null;
    },
    addOrganizationEmail: (state, action) => {
      const { organizationId, email } = action.payload;
      if (!state.organizationEmails[organizationId]) {
        state.organizationEmails[organizationId] = [];
      }
      state.organizationEmails[organizationId].push({
        fieldData: {
          email: email.email,
          label: email.label,
          f_primary: email.f_primary,
          __ID: email.fieldData?.__ID
        }
      });
      state.loading = false;
      state.error = null;
    },
    updateOrganizationEmail: (state, action) => {
      const { organizationId, emailId, updatedEmail } = action.payload;
      const emails = state.organizationEmails[organizationId];
      if (emails) {
        const index = emails.findIndex(email => email.fieldData.__ID === emailId);
        if (index !== -1) {
          emails[index] = {
            fieldData: {
              ...emails[index].fieldData,
              email: updatedEmail.email,
              label: updatedEmail.label,
              f_primary: updatedEmail.f_primary
            }
          };
        }
      }
      state.loading = false;
      state.error = null;
    },
    removeOrganizationEmail: (state, action) => {
      const { organizationId, emailId } = action.payload;
      const emails = state.organizationEmails[organizationId];
      if (emails) {
        state.organizationEmails[organizationId] = emails.filter(
          email => email.fieldData.__ID !== emailId
        );
      }
      state.loading = false;
      state.error = null;
    },

    // Pending Changes Management
    setPendingEmailChange: (state, action) => {
      const { organizationId, emailId, field, value } = action.payload;
      if (!state.pendingChanges[organizationId]) {
        state.pendingChanges[organizationId] = {};
      }
      if (!state.pendingChanges[organizationId][emailId]) {
        state.pendingChanges[organizationId][emailId] = {};
      }
      state.pendingChanges[organizationId][emailId][field] = value;
    },
    clearPendingEmailChanges: (state, action) => {
      const { organizationId, emailId } = action.payload;
      if (emailId) {
        if (state.pendingChanges[organizationId]) {
          delete state.pendingChanges[organizationId][emailId];
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
  setOrganizationEmails,
  addOrganizationEmail,
  updateOrganizationEmail,
  removeOrganizationEmail,
  setPendingEmailChange,
  clearPendingEmailChanges,
} = organizationEmailSlice.actions;

// Thunk Actions
export const fetchOrganizationEmails = (organizationId) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/emails`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      }
    });
    if (!response.ok) throw new Error('Failed to fetch organization emails');
    const data = await response.json();
    dispatch(setOrganizationEmails({ organizationId, emails: data }));
  } catch (error) {
    dispatch(setError(error.message));
  }
};

export const createOrganizationEmail = (organizationId, emailData) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/emails`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      },
      body: JSON.stringify(emailData),
    });
    if (!response.ok) throw new Error('Failed to create organization email');
    const data = await response.json();
    dispatch(addOrganizationEmail({ 
      organizationId, 
      email: data.response.data[0]
    }));
    return data.response.data[0];
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  }
};

export const updateOrganizationEmailRecord = (organizationId, emailId, emailData) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/emails/${emailId}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      },
      body: JSON.stringify(emailData),
    });
    if (!response.ok) throw new Error('Failed to update organization email');
    const data = await response.json();
    dispatch(updateOrganizationEmail({ 
      organizationId, 
      emailId, 
      updatedEmail: data.response.data[0]
    }));
    dispatch(clearPendingEmailChanges({ organizationId, emailId }));
    return data.response.data[0];
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  }
};

export const deleteOrganizationEmail = (organizationId, emailId) => async (dispatch, getState) => {
  try {
    dispatch(setLoading(true));
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/emails/${emailId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      }
    });
    if (!response.ok) throw new Error('Failed to delete organization email');
    dispatch(removeOrganizationEmail({ organizationId, emailId }));
  } catch (error) {
    dispatch(setError(error.message));
    throw error;
  }
};

// Selectors
import { createSelector } from '@reduxjs/toolkit';

const selectAllOrganizationEmails = (state) => state.organizationEmail.organizationEmails;

export const selectOrganizationEmails = createSelector(
  [selectAllOrganizationEmails, (_, organizationId) => organizationId],
  (allEmails, organizationId) => allEmails[organizationId] || []
);

export const selectOrganizationEmailLoading = (state) => 
  state.organizationEmail.loading;

export const selectOrganizationEmailError = (state) => 
  state.organizationEmail.error;

const selectAllPendingChanges = (state) => state.organizationEmail.pendingChanges;

export const selectOrganizationEmailPendingChanges = createSelector(
  [selectAllPendingChanges, (_, organizationId, emailId) => ({ organizationId, emailId })],
  (pendingChanges, { organizationId, emailId }) => 
    pendingChanges[organizationId]?.[emailId] || {}
);

export const selectEditMode = (state) => 
  state.organizationEmail.editMode;

export const selectNotification = (state) => 
  state.organizationEmail.notification;

export const selectValidationErrors = (state) => 
  state.organizationEmail.validationErrors;

export default organizationEmailSlice.reducer;
