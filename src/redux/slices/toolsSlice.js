import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import supabaseService from '../../services/supabaseService';

/**
 * Supabase realtime subscription for functions table
 */
export const subscribeToTools = () => (dispatch) => {
  const channel = supabaseService.executeQuery(supabase => {
    return supabase.channel('functions-changes')
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
  });

  // Return unsubscribe function
  return () => {
    supabaseService.executeQuery(supabase => supabase.removeChannel(channel));
  };
};

export const deleteTool = createAsyncThunk(
  'tools/deleteTool',
  async (id, { rejectWithValue, dispatch }) => {
    try {
      const response = await supabaseService.executeQuery(supabase =>
        supabase
          .from('functions')
          .delete()
          .eq('id', id)
      );
      
      console.log('Delete tool response:', response);
      
      // Still need to dispatch the action to update the state
      dispatch(removeToolById(id));
      
      // Just return the entire response
      return response;
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
      const response = await supabaseService.executeQuery(supabase =>
        supabase
          .from('functions')
          .select('*')
      );

      console.log('Full Supabase response:', response);
      
      // Just return the entire response
      return response;
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
      console.log('Saving tool with data:', toolData);
      const response = await supabaseService.executeQuery(supabase =>
        supabase
          .from('functions')
          .insert([toolData])
          .select()
      );
      
      console.log('Full Supabase response:', response);
      
      // Just return the entire response
      return response;
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
      console.log('Executing tool with ID:', id, 'and input:', input);
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/functions/execute/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(input)
      });

      console.log('Execute tool response status:', response.status);

      if (!response.ok) {
        const errorMessage = `Failed to execute tool: ${response.status} ${response.statusText}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Raw execution result:', result);
      
      // Just return the result directly
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
        // The response is already an array of tools, not an object with .data
        state.items = Array.isArray(action.payload) ? action.payload : [];
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
        // Extract data from the response
        const data = action.payload.data;
        if (data && Array.isArray(data) && data.length > 0) {
          state.items.push(data[0]);
        } else if (action.meta && action.meta.arg) {
          // If no data returned but we have the original tool data, use that
          state.items.push(action.meta.arg);
        }
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