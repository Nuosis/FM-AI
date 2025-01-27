import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../utils/axios';

export const fetchFunctions = createAsyncThunk(
  'functions/fetchFunctions',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching functions...');
      const response = await axios.get('/api/admin/aifunctions/');
      console.log('Functions API response:', response.data);
      return response.data;
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
            _partyId: item.fieldData._partyId,
            createdAt: item.fieldData.createdAt || item.fieldData.__ID
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
