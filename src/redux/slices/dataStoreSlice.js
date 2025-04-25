import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import supabaseService from '../../services/supabaseService';
import { updateUserPreferences } from '../slices/authSlice';

/**
 * Supabase realtime subscription for data_store changes
 */
export const subscribeToDataSources = () => (dispatch) => {
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
                dispatch({ type: 'dataStore/setDataSources', payload: payload.new.preference_value });
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

export const fetchDataSources = createAsyncThunk(
  'dataStore/fetchDataSources',
  async (_, { rejectWithValue, getState }) => {
    try {
      console.log('Fetching data sources...');
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

      console.log('Data sources response:', response);
      
      // Return the data sources
      return response;
    } catch (error) {
      console.error('Data sources API error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to fetch data sources');
    }
  }
);

export const saveDataSource = createAsyncThunk(
  'dataStore/saveDataSource',
  async (dataSourceData, { rejectWithValue, getState, dispatch }) => {
    try {
      console.log('Saving data source with data:', dataSourceData);
      const state = getState();
      const userId = state.auth.user?.user_id;
      const currentDataSources = state.dataStore.items || [];
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      
      // Generate a source_id if not provided
      if (!dataSourceData.source_id) {
        dataSourceData.source_id = `ds_${Date.now()}`;
      }
      
      // Add the new data source to the list
      const updatedDataSources = [...currentDataSources, dataSourceData];
      
      // Save to Supabase
      await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'data_store',
            preference_value: updatedDataSources
          }, {
            onConflict: 'user_id,preference_key'
          })
      );
      
      // Store credentials in key_store if provided
      if (dataSourceData.username || dataSourceData.password || dataSourceData.accessToken) {
        try {
          // Determine if using username/password or access token
          if (dataSourceData.accessToken) {
            // Store access token
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: userId,
                  provider: `data_store.${dataSourceData.source_id}`,
                  api_key: dataSourceData.accessToken,
                  verified: true
                }, {
                  onConflict: 'user_id,provider'
                })
            );
          } else if (dataSourceData.username || dataSourceData.password) {
            // Store username/password
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: userId,
                  provider: `data_store.${dataSourceData.source_id}`,
                  username: dataSourceData.username,
                  password: dataSourceData.password,
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
        value: updatedDataSources
      }));
      
      return { data: dataSourceData };
    } catch (error) {
      console.error('Save data source error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to save data source');
    }
  }
);

export const updateDataSource = createAsyncThunk(
  'dataStore/updateDataSource',
  async (dataSourceData, { rejectWithValue, getState, dispatch }) => {
    try {
      console.log('Updating data source with data:', dataSourceData);
      const state = getState();
      const userId = state.auth.user?.user_id;
      const currentDataSources = state.dataStore.items || [];
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      
      // Find the data source to update
      const index = currentDataSources.findIndex(ds => ds.source_id === dataSourceData.source_id);
      
      if (index === -1) {
        return rejectWithValue('Data source not found');
      }
      
      // Update the data source in the list
      const updatedDataSources = [...currentDataSources];
      updatedDataSources[index] = dataSourceData;
      
      // Save to Supabase
      await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'data_store',
            preference_value: updatedDataSources
          }, {
            onConflict: 'user_id,preference_key'
          })
      );
      
      // Update credentials in key_store if provided
      if (dataSourceData.username || dataSourceData.password || dataSourceData.accessToken) {
        try {
          // Determine if using username/password or access token
          if (dataSourceData.accessToken) {
            // Store access token
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: userId,
                  provider: `data_store.${dataSourceData.source_id}`,
                  api_key: dataSourceData.accessToken,
                  verified: true
                }, {
                  onConflict: 'user_id,provider'
                })
            );
          } else if (dataSourceData.username || dataSourceData.password) {
            // Store username/password
            await supabaseService.executeQuery(supabase =>
              supabase
                .from('key_store')
                .upsert({
                  user_id: userId,
                  provider: `data_store.${dataSourceData.source_id}`,
                  username: dataSourceData.username,
                  password: dataSourceData.password,
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
        value: updatedDataSources
      }));
      
      return { data: dataSourceData };
    } catch (error) {
      console.error('Update data source error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to update data source');
    }
  }
);

export const deleteDataSource = createAsyncThunk(
  'dataStore/deleteDataSource',
  async (sourceId, { rejectWithValue, getState, dispatch }) => {
    try {
      console.log('Deleting data source with ID:', sourceId);
      const state = getState();
      const userId = state.auth.user?.user_id;
      const currentDataSources = state.dataStore.items || [];
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      
      // Find the data source to delete
      const dataSource = currentDataSources.find(ds => ds.source_id === sourceId);
      
      if (!dataSource) {
        return rejectWithValue('Data source not found');
      }
      
      // Remove the data source from the list
      const updatedDataSources = currentDataSources.filter(ds => ds.source_id !== sourceId);
      
      // Save to Supabase
      await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'data_store',
            preference_value: updatedDataSources
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
          .eq('provider', `data_store.${sourceId}`)
      );
      
      // Update Redux state
      dispatch(updateUserPreferences({
        key: 'data_store',
        value: updatedDataSources
      }));
      
      return { sourceId };
    } catch (error) {
      console.error('Delete data source error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to delete data source');
    }
  }
);

const initialState = {
  items: [],
  activeDataSource: null,
  isLoading: false,
  error: null
};

const dataStoreSlice = createSlice({
  name: 'dataStore',
  initialState,
  reducers: {
    setDataSources: (state, action) => {
      state.items = action.payload;
    },
    addDataSource: (state, action) => {
      state.items.push(action.payload);
    },
    updateDataSourceById: (state, action) => {
      const index = state.items.findIndex(ds => ds.source_id === action.payload.source_id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    removeDataSourceById: (state, action) => {
      state.items = state.items.filter(ds => ds.source_id !== action.payload);
    },
    setActiveDataSource: (state, action) => {
      state.activeDataSource = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchDataSources
      .addCase(fetchDataSources.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDataSources.fulfilled, (state, action) => {
        state.isLoading = false;
        // Extract data from the response
        console.log('fetchDataSources.fulfilled payload:', action.payload);
        
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
      .addCase(fetchDataSources.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // saveDataSource
      .addCase(saveDataSource.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveDataSource.fulfilled, (state) => {
        state.isLoading = false;
        // The data source is already added to the items array in the thunk
      })
      .addCase(saveDataSource.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // updateDataSource
      .addCase(updateDataSource.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateDataSource.fulfilled, (state) => {
        state.isLoading = false;
        // The data source is already updated in the items array in the thunk
      })
      .addCase(updateDataSource.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // deleteDataSource
      .addCase(deleteDataSource.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteDataSource.fulfilled, (state) => {
        state.isLoading = false;
        // The data source is already removed from the items array in the thunk
      })
      .addCase(deleteDataSource.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

// Export actions
export const {
  setDataSources,
  addDataSource,
  updateDataSourceById,
  removeDataSourceById,
  setActiveDataSource
} = dataStoreSlice.actions;

// Export selectors
export const selectDataSources = (state) => state.dataStore.items;
export const selectActiveDataSource = (state) => {
  const activeId = state.dataStore.activeDataSource;
  if (activeId) {
    return state.dataStore.items.find(ds => ds.source_id === activeId);
  }
  return state.dataStore.items[0] || null;
};
export const selectDataSourcesLoading = (state) => state.dataStore.isLoading;
export const selectDataSourcesError = (state) => state.dataStore.error;
export const selectIsDataStoreReady = (state) => state.dataStore.items.length > 0;

// Export reducer
export default dataStoreSlice.reducer;