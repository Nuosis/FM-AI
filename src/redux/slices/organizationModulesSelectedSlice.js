import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunks
export const fetchOrganizationModulesSelected = createAsyncThunk(
  'organizationModulesSelected/fetchOrganizationModulesSelected',
  async (orgId, { getState }) => {
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${orgId}/modules-selected`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch modules selected');
    }
    return response.json();
  }
);

export const createModuleSelected = createAsyncThunk(
  'organizationModulesSelected/createModuleSelected',
  async ({ orgId, moduleSelectedData }, { getState }) => {
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${orgId}/modules-selected`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(moduleSelectedData)
    });
    if (!response.ok) {
      throw new Error('Failed to create module selected');
    }
    const data = await response.json();
    return data.response.data[0];
  }
);

export const updateModuleSelected = createAsyncThunk(
  'organizationModulesSelected/updateModuleSelected',
  async ({ orgId, moduleSelectedId, updateData }, { getState }) => {
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${orgId}/modules-selected/${moduleSelectedId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    if (!response.ok) {
      throw new Error('Failed to update module selected');
    }
    return { id: moduleSelectedId, ...updateData };
  }
);

export const deleteModuleSelected = createAsyncThunk(
  'organizationModulesSelected/deleteModuleSelected',
  async ({ orgId, moduleSelectedId }, { getState }) => {
    const accessToken = getState().auth.accessToken;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/organizations/${orgId}/modules-selected/${moduleSelectedId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
      }
    });
    if (!response.ok) {
      throw new Error('Failed to delete module selected');
    }
    return moduleSelectedId;
  }
);

const organizationModulesSelectedSlice = createSlice({
  name: 'organizationModulesSelected',
  initialState: {
    organizationModules: {}, // Keyed by organization ID
    status: 'idle',
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch cases
      .addCase(fetchOrganizationModulesSelected.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchOrganizationModulesSelected.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { orgId, data } = action.payload;
        state.organizationModules[orgId] = data;
        state.error = null;
      })
      .addCase(fetchOrganizationModulesSelected.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Create cases
      .addCase(createModuleSelected.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createModuleSelected.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { orgId, module } = action.payload;
        if (!state.organizationModules[orgId]) {
          state.organizationModules[orgId] = [];
        }
        state.organizationModules[orgId].push(module);
        state.error = null;
      })
      .addCase(createModuleSelected.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Update cases
      .addCase(updateModuleSelected.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateModuleSelected.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { orgId, id, ...updates } = action.payload;
        const modules = state.organizationModules[orgId];
        if (modules) {
          const index = modules.findIndex(
            module => module.fieldData.__ID === id
          );
          if (index !== -1) {
            modules[index].fieldData = {
              ...modules[index].fieldData,
              ...updates
            };
          }
        }
        state.error = null;
      })
      .addCase(updateModuleSelected.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Delete cases
      .addCase(deleteModuleSelected.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteModuleSelected.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { orgId, moduleSelectedId } = action.payload;
        if (state.organizationModules[orgId]) {
          state.organizationModules[orgId] = state.organizationModules[orgId].filter(
            module => module.fieldData.__ID !== moduleSelectedId
          );
        }
        state.error = null;
      })
      .addCase(deleteModuleSelected.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  }
});

// Selectors
import { createSelector } from '@reduxjs/toolkit';

const selectAllOrganizationModules = (state) => state.organizationModulesSelected.organizationModules;

export const selectOrganizationModulesSelected = createSelector(
  [selectAllOrganizationModules, (_, organizationId) => organizationId],
  (allModules, organizationId) => allModules[organizationId] || []
);

export default organizationModulesSelectedSlice.reducer;
