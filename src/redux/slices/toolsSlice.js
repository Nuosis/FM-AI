import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import supabase from '../../utils/supabase';

/**
 * Supabase realtime subscription for functions table
 */
export const subscribeToTools = () => (dispatch) => {
  const channel = supabase.channel('functions-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'functions' },
      (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            dispatch({ type: 'tools/addTool', payload: payload.new });
            break;
          case 'UPDATE':
            dispatch({ type: 'tools/updateTool', payload: payload.new });
            break;
          case 'DELETE':
            dispatch({ type: 'tools/deleteTool', payload: payload.old.id });
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

export const deleteTool = createAsyncThunk(
  'tools/deleteTool',
  async (id, { rejectWithValue, dispatch }) => {
    try {
      const { error } = await supabase
        .from('functions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      dispatch(removeToolById(id));
      return id;
    } catch (error) {
      console.error('Delete tool error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return rejectWithValue(error.response?.data || 'Failed to delete tool');
    }
  }
);

export const fetchTools = createAsyncThunk(
  'tools/fetchTools',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching tools...');
      const { data, error } = await supabase
        .from('functions')
        .select('*');

      if (error) throw error;

      console.log('Tools API response:', data);
      return data;
    } catch (error) {
      console.error('Tools API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return rejectWithValue(error.response?.data || 'Failed to fetch tools');
    }
  }
);

export const saveTool = createAsyncThunk(
  'tools/saveTool',
  async (toolData, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('functions')
        .insert([toolData])
        .select();

      if (error) throw error;

      return data[0];
    } catch (error) {
      console.error('Save tool error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return rejectWithValue(error.response?.data || 'Failed to save tool');
    }
  }
);

export const executeToolCode = createAsyncThunk(
  'tools/executeToolCode',
  async ({ id, input }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/functions/execute/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute tool');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Execute tool error:', error);
      return rejectWithValue(error.message || 'Failed to execute tool');
    }
  }
);

const initialState = {
  items: [],
  isLoading: false,
  error: null,
  executionResult: null,
  executionError: null,
  isExecuting: false
};

const toolsSlice = createSlice({
  name: 'tools',
  initialState,
  reducers: {
    setTools: (state, action) => {
      state.items = action.payload;
    },
    addTool: (state, action) => {
      state.items.push(action.payload);
    },
    updateTool: (state, action) => {
      const index = state.items.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    removeToolById: (state, action) => {
      state.items = state.items.filter(t => t.id !== action.payload);
    },
    clearExecutionResult: (state) => {
      state.executionResult = null;
      state.executionError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchTools
      .addCase(fetchTools.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTools.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchTools.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // saveTool
      .addCase(saveTool.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveTool.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.push(action.payload);
      })
      .addCase(saveTool.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // executeToolCode
      .addCase(executeToolCode.pending, (state) => {
        state.isExecuting = true;
        state.executionResult = null;
        state.executionError = null;
      })
      .addCase(executeToolCode.fulfilled, (state, action) => {
        state.isExecuting = false;
        state.executionResult = action.payload;
      })
      .addCase(executeToolCode.rejected, (state, action) => {
        state.isExecuting = false;
        state.executionError = action.payload;
      });
  }
});

// Export actions
export const {
  setTools,
  addTool,
  updateTool,
  removeToolById,
  clearExecutionResult
} = toolsSlice.actions;

// Export selectors
export const selectTools = (state) => state.tools.items;
export const selectToolsLoading = (state) => state.tools.isLoading;
export const selectToolsError = (state) => state.tools.error;
export const selectExecutionResult = (state) => state.tools.executionResult;
export const selectExecutionError = (state) => state.tools.executionError;
export const selectIsExecuting = (state) => state.tools.isExecuting;

// Export reducer
export default toolsSlice.reducer;