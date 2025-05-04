import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import supabaseService from '../../services/supabaseService';
import toolService from '../../services/toolService';

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

/**
 * Delete a tool by ID
 */
export const deleteTool = createAsyncThunk(
  'tools/deleteTool',
  async (id, { rejectWithValue, dispatch }) => {
    try {
      console.log('Deleting tool with ID:', id);
      
      // Use the toolService to delete the tool
      const response = await toolService.deleteTool(id);
      
      console.log('Delete tool response:', response);
      
      // Still need to dispatch the action to update the state
      dispatch(removeToolById(id));
      
      return response;
    } catch (error) {
      console.error('Delete tool error:', error);
      return rejectWithValue(error.message || 'Failed to delete tool');
    }
  }
);

/**
 * Fetch all tools
 */
export const fetchTools = createAsyncThunk(
  'tools/fetchTools',
  async (_, { rejectWithValue }) => {
    try {
      console.log('Fetching tools...');
      
      // Use the toolService to get all tools
      const tools = await toolService.getTools();
      
      console.log('Fetched tools:', tools);
      
      return tools;
    } catch (error) {
      console.error('Tools API error:', error);
      return rejectWithValue(error.message || 'Failed to fetch tools');
    }
  }
);

/**
 * Save a new tool
 */
export const saveTool = createAsyncThunk(
  'tools/saveTool',
  async (toolData, { rejectWithValue }) => {
    try {
      console.log('Saving tool with data:', toolData);
      
      // Use the toolService to create the tool
      const response = await toolService.createTool(toolData);
      
      console.log('Save tool response:', response);
      
      return response; // Return the direct response from Supabase
    } catch (error) {
      console.error('Save tool error:', error);
      return rejectWithValue(error.message || 'Failed to save tool');
    }
  }
);

/**
 * Update an existing tool
 */
export const updateToolAsync = createAsyncThunk(
  'tools/updateToolAsync',
  async (toolData, { rejectWithValue, dispatch }) => {
    try {
      console.log('Updating tool with data:', toolData);
      
      // Use the toolService to update the tool
      const response = await toolService.updateTool(toolData.id, toolData);
      
      console.log('Update tool response:', response);
      
      // Dispatch the action to update the state
      dispatch({ type: 'tools/updateTool', payload: response });
      
      return response; // Return the direct response from Supabase
    } catch (error) {
      console.error('Update tool error:', error);
      return rejectWithValue(error.message || 'Failed to update tool');
    }
  }
);

/**
 * Execute a tool with the given input
 */
export const executeToolCode = createAsyncThunk(
  'tools/executeToolCode',
  async ({ id, input }, { rejectWithValue }) => {
    try {
      console.log('Executing tool with ID:', id, 'and input:', input);
      
      // Use the toolService to execute the tool
      const result = await toolService.executeTool(id, input);
      
      console.log('Execution result:', result);
      
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
        console.log('fetchTools.fulfilled payload:', action.payload);
        
        if (Array.isArray(action.payload)) {
          state.items = action.payload;
          console.log('Setting tools.items to array of length:', action.payload.length);
        } else {
          // Fallback to empty array if no data
          state.items = [];
          console.log('No tools array found, setting tools.items to empty array');
        }
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
        
        // Add the new tool to the items array
        if (action.payload) {
          state.items.push(action.payload);
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