import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import supabaseService from '../../services/supabaseService';
import { updateUserPreferences } from '../slices/authSlice';

/**
 * Supabase realtime subscription for data_store changes
 */
export const subscribeToDataStores = () => (dispatch) => {
  const channel = supabaseService.executeQuery(supabase => {
    return supabase.channel('data-store-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_preferences', filter: 'preference_key=eq.data_store' },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
            case 'UPDATE':
              if (payload.new && payload.new.preference_value) {
                dispatch({ type: 'dataStore/setDataStores', payload: payload.new.preference_value });
              }
            break;
          default:
            break;
        }
      }
    )
    .subscribe();
  });

  // Return unsubscribe function
  return () => {
    supabaseService.executeQuery(supabase => supabase.removeChannel(channel));
  };
};

export const fetchDataStores = createAsyncThunk(
  'dataStore/fetchDataStores',
  async (_, { rejectWithValue, getState }) => {
    try {
      console.log('Fetching data stores...');
      const state = getState();
      const userId = state.auth.user?.user_id;
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      
      const response = await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .eq('preference_key', 'data_store')
          .single()
      );

      console.log('Data stores response:', response);
      
      // Return the data stores
      return response;
    } catch (error) {
      console.error('Data stores API error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to fetch data stores');
    }
  }
);

export const saveDataStore = createAsyncThunk(
  'dataStore/saveDataStore',
  async (dataStoreData, { rejectWithValue, getState, dispatch }) => {
    try {
      console.log('Saving data store with data:', dataStoreData);
      const state = getState();
      const userId = state.auth.user?.user_id;
      const currentDataStores = state.dataStore.items || [];
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      
      // Generate a source_id if not provided
      if (!dataStoreData.source_id) {
        dataStoreData.source_id = `ds_${Date.now()}`;
      }
      
      // Add the new data store to the list
      const updatedDataStores = [...currentDataStores, dataStoreData];
      
      // Save to Supabase
      await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'data_store',
            preference_value: updatedDataStores
          }, {
            onConflict: 'user_id,preference_key'
          })
      );
      
      // Store credentials in key_store if provided
      if (dataStoreData.username || dataStoreData.password || dataStoreData.accessToken) {
        try {
          // Determine if using username/password or access token
          if (dataStoreData.accessToken) {
            // Store access token
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: userId,
                  provider: `data_store.${dataStoreData.source_id}`,
                  api_key: dataStoreData.accessToken,
                  verified: true
                }, {
                  onConflict: 'user_id,provider'
                })
            );
          } else if (dataStoreData.username || dataStoreData.password) {
            // Store username/password
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: userId,
                  provider: `data_store.${dataStoreData.source_id}`,
                  username: dataStoreData.username,
                  password: dataStoreData.password,
                  verified: true
                }, {
                  onConflict: 'user_id,provider'
                })
            );
          }
        } catch (credError) {
          console.error('Error storing credentials:', credError);
          // Continue with the process even if credential storage fails
        }
      }
      
      // Update Redux state
      dispatch(updateUserPreferences({
        key: 'data_store',
        value: updatedDataStores
      }));
      
      return { data: dataStoreData };
    } catch (error) {
      console.error('Save data store error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to save data store');
    }
  }
);

export const updateDataStore = createAsyncThunk(
  'dataStore/updateDataStore',
  async (dataStoreData, { rejectWithValue, getState, dispatch }) => {
    try {
      console.log('Updating data store with data:', dataStoreData);
      const state = getState();
      const userId = state.auth.user?.user_id;
      const currentDataStores = state.dataStore.items || [];
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      
      // Find the data store to update
      const index = currentDataStores.findIndex(ds => ds.source_id === dataStoreData.source_id);
      
      if (index === -1) {
        return rejectWithValue('Data store not found');
      }
      
      // Update the data store in the list
      const updatedDataStores = [...currentDataStores];
      updatedDataStores[index] = dataStoreData;
      
      // Save to Supabase
      await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'data_store',
            preference_value: updatedDataStores
          }, {
            onConflict: 'user_id,preference_key'
          })
      );
      
      // Update credentials in key_store if provided
      if (dataStoreData.username || dataStoreData.password || dataStoreData.accessToken) {
        try {
          // Determine if using username/password or access token
          if (dataStoreData.accessToken) {
            // Store access token
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: userId,
                  provider: `data_store.${dataStoreData.source_id}`,
                  api_key: dataStoreData.accessToken,
                  verified: true
                }, {
                  onConflict: 'user_id,provider'
                })
            );
          } else if (dataStoreData.username || dataStoreData.password) {
            // Store username/password
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: userId,
                  provider: `data_store.${dataStoreData.source_id}`,
                  username: dataStoreData.username,
                  password: dataStoreData.password,
                  verified: true
                }, {
                  onConflict: 'user_id,provider'
                })
            );
          }
        } catch (credError) {
          console.error('Error updating credentials:', credError);
          // Continue with the process even if credential storage fails
        }
      }
      
      // Update Redux state
      dispatch(updateUserPreferences({
        key: 'data_store',
        value: updatedDataStores
      }));
      
      return { data: dataStoreData };
    } catch (error) {
      console.error('Update data store error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to update data store');
    }
  }
);

export const deleteDataStore = createAsyncThunk(
  'dataStore/deleteDataStore',
  async (storeId, { rejectWithValue, getState, dispatch }) => {
    try {
      console.log('Deleting data store with ID:', storeId);
      const state = getState();
      const userId = state.auth.user?.user_id;
      const currentDataStores = state.dataStore.items || [];
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      
      // Find the data store to delete
      const dataStore = currentDataStores.find(ds => ds.source_id === storeId);
      
      if (!dataStore) {
        return rejectWithValue('Data store not found');
      }
      
      // Remove the data store from the list
      const updatedDataStores = currentDataStores.filter(ds => ds.source_id !== storeId);
      
      // Save to Supabase
      await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'data_store',
            preference_value: updatedDataStores
          }, {
            onConflict: 'user_id,preference_key'
          })
      );
      
      // Delete credentials from key_store
      await supabaseService.executeQuery(supabase =>
        supabase
          .from('key_store')
          .delete()
          .eq('user_id', userId)
          .eq('provider', `data_store.${storeId}`)
      );
      
      // Update Redux state
      dispatch(updateUserPreferences({
        key: 'data_store',
        value: updatedDataStores
      }));
      
      return { storeId };
    } catch (error) {
      console.error('Delete data store error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to delete data store');
    }
  }
);

const initialState = {
  items: [],
  activeDataStore: null,
  isLoading: false,
  error: null
};

const dataStoreSlice = createSlice({
  name: 'dataStore',
  initialState,
  reducers: {
    setDataStores: (state, action) => {
      state.items = action.payload;
    },
    addDataStore: (state, action) => {
      state.items.push(action.payload);
    },
    updateDataStoreById: (state, action) => {
      const index = state.items.findIndex(ds => ds.source_id === action.payload.source_id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    removeDataStoreById: (state, action) => {
      state.items = state.items.filter(ds => ds.source_id !== action.payload);
    },
    setActiveDataStore: (state, action) => {
      state.activeDataStore = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchDataStores
      .addCase(fetchDataStores.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDataStores.fulfilled, (state, action) => {
        state.isLoading = false;
        // Extract data from the response
        console.log('fetchDataStores.fulfilled payload:', action.payload);
        
        // The supabaseService.executeQuery returns the data directly, not a response object with a data property
        if (action.payload && action.payload.preference_value) {
          state.items = action.payload.preference_value;
          console.log('Setting dataStore.items to:', action.payload.preference_value);
        } else {
          // Fallback to empty array if no data
          state.items = [];
          console.log('No preference_value found, setting dataStore.items to empty array');
        }
      })
      .addCase(fetchDataStores.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // saveDataStore
      .addCase(saveDataStore.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveDataStore.fulfilled, (state) => {
        state.isLoading = false;
        // The data store is already added to the items array in the thunk
      })
      .addCase(saveDataStore.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // updateDataStore
      .addCase(updateDataStore.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateDataStore.fulfilled, (state) => {
        state.isLoading = false;
        // The data store is already updated in the items array in the thunk
      })
      .addCase(updateDataStore.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // deleteDataStore
      .addCase(deleteDataStore.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteDataStore.fulfilled, (state) => {
        state.isLoading = false;
        // The data store is already removed from the items array in the thunk
      })
      .addCase(deleteDataStore.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

// Export actions
export const {
  setDataStores,
  addDataStore,
  updateDataStoreById,
  removeDataStoreById,
  setActiveDataStore
} = dataStoreSlice.actions;

// Export selectors
export const selectDataStores = (state) => state.dataStore.items;
export const selectActiveDataStore = (state) => {
  const activeId = state.dataStore.activeDataStore;
  if (activeId) {
    return state.dataStore.items.find(ds => ds.source_id === activeId);
  }
  return state.dataStore.items[0] || null;
};
export const selectDataStoresLoading = (state) => state.dataStore.isLoading;
export const selectDataStoresError = (state) => state.dataStore.error;
export const selectIsDataStoreReady = (state) => state.dataStore.items.length > 0;

// Export reducer
export default dataStoreSlice.reducer;