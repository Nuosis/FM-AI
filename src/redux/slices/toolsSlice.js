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

export const updateToolAsync = createAsyncThunk(
  'tools/updateToolAsync',
  async (toolData, { rejectWithValue, dispatch }) => {
    try {
      console.log('Updating tool with data:', toolData);
      const response = await supabaseService.executeQuery(supabase =>
        supabase
          .from('functions')
          .update(toolData)
          .eq('id', toolData.id)
          .select()
      );
      
      console.log('Update tool response:', response);
      
      // Dispatch the action to update the state
      if (response.data && response.data.length > 0) {
        dispatch({ type: 'tools/updateTool', payload: response.data[0] });
      }
      
      // Return the entire response
      return response;
    } catch (error) {
      console.error('Update tool error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      return rejectWithValue(error.response?.data || 'Failed to update tool');
    }
  }
);

export const executeToolCode = createAsyncThunk(
  'tools/executeToolCode',
  async ({ id, input }, { rejectWithValue }) => {
    try {
      console.log('Executing tool with ID:', id, 'and input:', input);
      
      // First, fetch the tool code from the database
      console.log('Fetching tool code from database for ID:', id);
      let toolData;
      try {
        toolData = await supabaseService.executeQuery(supabase =>
          supabase
            .from('functions')
            .select('*')  // Select all fields to see what's available
            .eq('id', id)
            .single()
        );
        
        console.log('Tool data fetched successfully:', toolData);
      } catch (dbError) {
        console.error('Database error when fetching tool:', dbError);
        throw new Error(`Failed to fetch tool code: ${dbError.message}`);
      }
      
      if (!toolData) {
        console.error('No tool found with ID:', id);
        throw new Error(`Tool not found with ID: ${id}`);
      }
      
      if (!toolData.code) {
        console.error('Tool has no code field:', toolData);
        throw new Error('Tool exists but has no code field');
      }
      
      // Clean up the code by removing @tool() decorator if present
      let cleanCode = toolData.code;
      if (cleanCode.includes('@tool()')) {
        console.log('Removing @tool() decorator from code');
        cleanCode = cleanCode.replace(/@tool\(\)\s*\n/g, '');
      }
      
      console.log('Tool code fetched successfully');
      
      // Check if the local proxy server is running
      try {
        // Try to connect to the proxy server health endpoint
        const healthResponse = await fetch('http://localhost:3500/health', { method: 'GET' });
        
        // Check if response is ok and the text is exactly 'ok'
        if (healthResponse.ok) {
          const responseText = await healthResponse.text();
          if (responseText === 'ok') {
            console.log('Proxy server health check successful, executing code');
            
            // Execute the code using the proxy server's /execute endpoint
            const executeResponse = await fetch('http://localhost:3500/execute', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                code: cleanCode,
                input: input
              })
            });
            
            if (!executeResponse.ok) {
              throw new Error(`Execution failed with status: ${executeResponse.status}`);
            }
            
            const result = await executeResponse.json();
            console.log('Execution result:', result);
            
            return result;
          } else {
            throw new Error(`Proxy server health check failed: unexpected response "${responseText}"`);
          }
        } else {
          throw new Error(`Proxy server health check failed with status: ${healthResponse.status}`);
        }
      } catch (proxyError) {
        console.error('Proxy server error:', proxyError);
        
        // Return an error indicating the proxy server is not running
        return {
          success: false,
          output: "",
          error: "Local proxy server is not running. Please deploy the server to execute Python code."
        };
      }
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
        
        // The supabaseService.executeQuery returns the data directly, not a response object with a data property
        // So action.payload is already the array of tools
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