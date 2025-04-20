import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import supabase from '../../utils/supabase';

/**
 * Supabase realtime subscription for aifunctions table
 */
export const subscribeToAIFunctions = () => (dispatch) => {
  const channel = supabase.channel('aifunctions-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'aifunctions' },
      (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            dispatch({ type: 'functions/addFunction', payload: payload.new });
            break;
          case 'UPDATE':
            dispatch({ type: 'functions/updateFunction', payload: payload.new });
            break;
          case 'DELETE':
            dispatch({ type: 'functions/deleteFunction', payload: payload.old.id });
            break;
          default:
            break;
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
};


export const deleteAIFunction = createAsyncThunk(
  'functions/deleteAIFunction',
  async (recordId, { rejectWithValue, dispatch }) => {
    try {
      const { error } = await supabase
        .from('aifunctions')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      dispatch(deleteFunction(recordId));
      return recordId;
    } catch (error) {
      console.error('Delete function error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return rejectWithValue(error.response?.data || 'Failed to delete function');
    }
  }
);

export const fetchFunctions = createAsyncThunk(
  'functions/fetchFunctions',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching functions...');
      const { data, error } = await supabase
        .from('aifunctions')
        .select('*');

      if (error) throw error;

      console.log('Functions API response:', data);


      return data;
    } catch (error) {
      console.error('Functions API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return rejectWithValue(error.response?.data || 'Failed to fetch functions');
    }
  }
);

const initialState = {
  items: [],
  isLoading: false,
  error: null,
};

const functionsSlice = createSlice({
  name: 'functions',
  initialState,
  reducers: {
    setFunctions: (state, action) => {
      state.items = action.payload;
    },
    addFunction: (state, action) => {
      state.items.push({
        id: Date.now().toString(), // Simple ID generation
        ...action.payload,
      });
    },
    updateFunction: (state, action) => {
      const index = state.items.findIndex(f => f.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    deleteFunction: (state, action) => {
      state.items = state.items.filter(f => f.id !== action.payload);
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFunctions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFunctions.fulfilled, (state, action) => {
        // console.log("fetchFunctions fulfilled:", {
        //   payload: action.payload,
        //   responseData: action.payload.response?.data
        // });
        state.isLoading = false;
        // Extract the functions data from the nested response structure
        const functions = action.payload.response?.data?.map(item => {
          // console.log("Processing item:", item);
          return {
            id: item.fieldData.__ID,
            name: item.fieldData.name,
            description: item.fieldData.description,
            input_variables: item.fieldData.input_variables.replace(/"/g, '').split(','),
            example: {
              input: JSON.parse(item.fieldData.example_input),
              output: item.fieldData.example_output
            },
            model: item.fieldData.model,
            provider: item.fieldData.provider,
            temperature: item.fieldData.temperature,
            prompt_template: item.fieldData.prompt_template,
            system_instructions: item.fieldData.system_instructions || '',
            _partyId: item.fieldData._partyID || item.fieldData.partyId, // Handle both field names
            createdAt: item.fieldData.createdAt || item.fieldData.__ID,
            recordId: item.recordId
          };
        }) || [];
        state.items = functions;
      })
      .addCase(fetchFunctions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

// Export actions
export const {
  setFunctions,
  addFunction,
  updateFunction,
  deleteFunction,
  setLoading,
  setError,
  clearError,
} = functionsSlice.actions;

// Export selectors
export const selectFunctions = (state) => state.functions.items;
export const selectFunctionsLoading = (state) => state.functions.isLoading;
export const selectFunctionsError = (state) => state.functions.error;

// Export reducer
export default functionsSlice.reducer;
