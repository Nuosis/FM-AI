import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { addLog } from './appSlice';

// Async thunks
export const fetchOrganizationSellable = createAsyncThunk(
  'organizationSellable/fetchOrganizationSellable',
  async (organizationId, { dispatch, rejectWithValue, getState }) => {
    try {
      const accessToken = getState().auth.accessToken;
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/sellables`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      dispatch(addLog({ message: `Error fetching organization sellables: ${error.message}`, type: 'error' }));
      return rejectWithValue(error.message);
    }
  }
);

export const createOrganizationSellable = createAsyncThunk(
  'organizationSellable/createOrganizationSellable',
  async ({ organizationId, sellableData }, { dispatch, rejectWithValue, getState }) => {
    try {
      const accessToken = getState().auth.accessToken;
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/sellables`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Origin': import.meta.env.VITE_FRONTEND_BASE_URL,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sellableData)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      dispatch(addLog({ message: 'Sellable created successfully', type: 'info' }));
      return data.response.data[0].fieldData;
    } catch (error) {
      dispatch(addLog({ message: `Error creating sellable: ${error.message}`, type: 'error' }));
      return rejectWithValue(error.message);
    }
  }
);

export const updateOrganizationSellable = createAsyncThunk(
  'organizationSellable/updateOrganizationSellable',
  async ({ organizationId, sellableId, updateData }, { dispatch, rejectWithValue, getState }) => {
    try {
      const accessToken = getState().auth.accessToken;
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/sellables/${sellableId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Origin': import.meta.env.VITE_FRONTEND_BASE_URL,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      dispatch(addLog({ message: 'Sellable updated successfully', type: 'info' }));
      return { id: sellableId, ...updateData };
    } catch (error) {
      dispatch(addLog({ message: `Error updating sellable: ${error.message}`, type: 'error' }));
      return rejectWithValue(error.message);
    }
  }
);

export const deleteOrganizationSellable = createAsyncThunk(
  'organizationSellable/deleteOrganizationSellable',
  async ({ organizationId, sellableId }, { dispatch, rejectWithValue, getState }) => {
    try {
      const accessToken = getState().auth.accessToken;
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/organizations/${organizationId}/sellables/${sellableId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Origin': import.meta.env.VITE_FRONTEND_BASE_URL
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      dispatch(addLog({ message: 'Sellable deleted successfully', type: 'info' }));
      return sellableId;
    } catch (error) {
      dispatch(addLog({ message: `Error deleting sellable: ${error.message}`, type: 'error' }));
      return rejectWithValue(error.message);
    }
  }
);

// Slice
const organizationSellableSlice = createSlice({
  name: 'organizationSellable',
  initialState: {
    organizationSellables: {}, // Keyed by organization ID
    status: 'idle',
    error: null
  },
  reducers: {
    clearSellables: (state, action) => {
      const { organizationId } = action.payload;
      if (organizationId) {
        delete state.organizationSellables[organizationId];
      } else {
        state.organizationSellables = {};
      }
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch cases
      .addCase(fetchOrganizationSellable.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchOrganizationSellable.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { organizationId, data } = action.payload;
        state.organizationSellables[organizationId] = data;
        state.error = null;
      })
      .addCase(fetchOrganizationSellable.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Create cases
      .addCase(createOrganizationSellable.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createOrganizationSellable.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { organizationId, sellable } = action.payload;
        if (!state.organizationSellables[organizationId]) {
          state.organizationSellables[organizationId] = [];
        }
        state.organizationSellables[organizationId].push({ fieldData: sellable });
        state.error = null;
      })
      .addCase(createOrganizationSellable.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Update cases
      .addCase(updateOrganizationSellable.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateOrganizationSellable.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { organizationId, id, ...updates } = action.payload;
        const sellables = state.organizationSellables[organizationId];
        if (sellables) {
          const index = sellables.findIndex(
            sellable => sellable.fieldData.__ID === id
          );
          if (index !== -1) {
            sellables[index].fieldData = {
              ...sellables[index].fieldData,
              ...updates
            };
          }
        }
        state.error = null;
      })
      .addCase(updateOrganizationSellable.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Delete cases
      .addCase(deleteOrganizationSellable.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(deleteOrganizationSellable.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { organizationId, sellableId } = action.payload;
        if (state.organizationSellables[organizationId]) {
          state.organizationSellables[organizationId] = state.organizationSellables[organizationId]
            .filter(sellable => sellable.fieldData.__ID !== sellableId);
        }
        state.error = null;
      })
      .addCase(deleteOrganizationSellable.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

// Selectors
import { createSelector } from '@reduxjs/toolkit';

const selectAllOrganizationSellables = (state) => state.organizationSellable.organizationSellables;

export const selectOrganizationSellables = createSelector(
  [selectAllOrganizationSellables, (_, organizationId) => organizationId],
  (allSellables, organizationId) => allSellables[organizationId] || []
);

export const selectSellableById = createSelector(
  [selectOrganizationSellables, (_, __, sellableId) => sellableId],
  (sellables, sellableId) => 
    sellables.find(sellable => sellable.fieldData.__ID === sellableId)
);

export const selectSellableStatus = (state) => state.organizationSellable.status;
export const selectSellableError = (state) => state.organizationSellable.error;

export const { clearSellables } = organizationSellableSlice.actions;

export default organizationSellableSlice.reducer;
