import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import supabaseService from '../../services/supabaseService';
import { updateUserPreferences } from './authSlice';

/**
 * Fetch all Knowledge entities for the current user
 */
export const fetchKnowledge = createAsyncThunk(
  'knowledge/fetchKnowledge',
  async (_, { rejectWithValue, getState }) => {
    try {
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
          .eq('preference_key', 'knowledge')
          .single()
      );
      
      return response;
    } catch (error) {
      console.error('Knowledge API error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to fetch knowledge');
    }
  }
);

/**
 * Create a new Knowledge entity
 */
export const createKnowledge = createAsyncThunk(
  'knowledge/createKnowledge',
  async (knowledgeData, { rejectWithValue, getState, dispatch }) => {
    try {
      const state = getState();
      const userId = state.auth.user?.user_id;
      const currentKnowledge = state.knowledge.items || [];
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      
      // Generate a knowledge_id if not provided
      if (!knowledgeData.knowledge_id) {
        knowledgeData.knowledge_id = `k_${Date.now()}`;
      }
      
      // Add the new knowledge to the list
      const updatedKnowledge = [...currentKnowledge, knowledgeData];
      
      // Save to Supabase
      await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'knowledge',
            preference_value: updatedKnowledge
          }, {
            onConflict: 'user_id,preference_key'
          })
      );
      
      // Update Redux state
      dispatch(updateUserPreferences({
        key: 'knowledge',
        value: updatedKnowledge
      }));
      
      return { data: knowledgeData };
    } catch (error) {
      console.error('Create knowledge error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to create knowledge');
    }
  }
);

/**
 * Update an existing Knowledge entity
 */
export const updateKnowledge = createAsyncThunk(
  'knowledge/updateKnowledge',
  async (knowledgeData, { rejectWithValue, getState, dispatch }) => {
    try {
      const state = getState();
      const userId = state.auth.user?.user_id;
      const currentKnowledge = state.knowledge.items || [];
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      
      // Find the knowledge to update
      const index = currentKnowledge.findIndex(k => k.knowledge_id === knowledgeData.knowledge_id);
      
      if (index === -1) {
        return rejectWithValue('Knowledge not found');
      }
      
      // Update the knowledge in the list
      const updatedKnowledge = [...currentKnowledge];
      updatedKnowledge[index] = knowledgeData;
      
      // Save to Supabase
      await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'knowledge',
            preference_value: updatedKnowledge
          }, {
            onConflict: 'user_id,preference_key'
          })
      );
      
      // Update Redux state
      dispatch(updateUserPreferences({
        key: 'knowledge',
        value: updatedKnowledge
      }));
      
      return { data: knowledgeData };
    } catch (error) {
      console.error('Update knowledge error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to update knowledge');
    }
  }
);

/**
 * Delete a Knowledge entity
 */
export const deleteKnowledge = createAsyncThunk(
  'knowledge/deleteKnowledge',
  async (knowledgeId, { rejectWithValue, getState, dispatch }) => {
    try {
      const state = getState();
      const userId = state.auth.user?.user_id;
      const currentKnowledge = state.knowledge.items || [];
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      
      // Find the knowledge to delete
      const knowledge = currentKnowledge.find(k => k.knowledge_id === knowledgeId);
      
      if (!knowledge) {
        return rejectWithValue('Knowledge not found');
      }
      
      // Check if knowledge has sources
      if (knowledge.sources && knowledge.sources.length > 0) {
        return rejectWithValue('Cannot delete knowledge with sources. Remove all sources first.');
      }
      
      // Remove the knowledge from the list
      const updatedKnowledge = currentKnowledge.filter(k => k.knowledge_id !== knowledgeId);
      
      // Save to Supabase
      await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'knowledge',
            preference_value: updatedKnowledge
          }, {
            onConflict: 'user_id,preference_key'
          })
      );
      
      // Update Redux state
      dispatch(updateUserPreferences({
        key: 'knowledge',
        value: updatedKnowledge
      }));
      
      return { knowledgeId };
    } catch (error) {
      console.error('Delete knowledge error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to delete knowledge');
    }
  }
);

/**
 * Add a source to a Knowledge entity
 */
export const addSource = createAsyncThunk(
  'knowledge/addSource',
  async ({ knowledgeId, sourceData }, { rejectWithValue, getState, dispatch }) => {
    try {
      const state = getState();
      const userId = state.auth.user?.user_id;
      const currentKnowledge = state.knowledge.items || [];
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      
      // Find the knowledge to update
      const index = currentKnowledge.findIndex(k => k.knowledge_id === knowledgeId);
      
      if (index === -1) {
        return rejectWithValue('Knowledge not found');
      }
      
      // Generate a source_id if not provided
      if (!sourceData.source_id) {
        sourceData.source_id = `s_${Date.now()}`;
      }
      
      // Add upload date if not provided
      if (!sourceData.upload_date) {
        sourceData.upload_date = new Date().toISOString();
      }
      
      // Add the source to the knowledge
      const updatedKnowledge = [...currentKnowledge];
      if (!updatedKnowledge[index].sources) {
        updatedKnowledge[index].sources = [];
      }
      updatedKnowledge[index].sources.push(sourceData);
      
      // Save to Supabase
      await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'knowledge',
            preference_value: updatedKnowledge
          }, {
            onConflict: 'user_id,preference_key'
          })
      );
      
      // Update Redux state
      dispatch(updateUserPreferences({
        key: 'knowledge',
        value: updatedKnowledge
      }));
      
      return { knowledgeId, sourceData };
    } catch (error) {
      console.error('Add source error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to add source');
    }
  }
);

/**
 * Delete a source from a Knowledge entity
 */
export const deleteSource = createAsyncThunk(
  'knowledge/deleteSource',
  async ({ knowledgeId, sourceId }, { rejectWithValue, getState, dispatch }) => {
    try {
      const state = getState();
      const userId = state.auth.user?.user_id;
      const currentKnowledge = state.knowledge.items || [];
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }
      
      // Find the knowledge to update
      const index = currentKnowledge.findIndex(k => k.knowledge_id === knowledgeId);
      
      if (index === -1) {
        return rejectWithValue('Knowledge not found');
      }
      
      // Check if knowledge has sources
      if (!currentKnowledge[index].sources || currentKnowledge[index].sources.length === 0) {
        return rejectWithValue('Knowledge has no sources');
      }
      
      // Remove the source from the knowledge
      const updatedKnowledge = [...currentKnowledge];
      updatedKnowledge[index].sources = updatedKnowledge[index].sources.filter(s => s.source_id !== sourceId);
      
      // Save to Supabase
      await supabaseService.executeQuery(supabase =>
        supabase
          .from('user_preferences')
          .upsert({
            user_id: userId,
            preference_key: 'knowledge',
            preference_value: updatedKnowledge
          }, {
            onConflict: 'user_id,preference_key'
          })
      );
      
      // Update Redux state
      dispatch(updateUserPreferences({
        key: 'knowledge',
        value: updatedKnowledge
      }));
      
      return { knowledgeId, sourceId };
    } catch (error) {
      console.error('Delete source error:', {
        message: error.message
      });
      return rejectWithValue(error.message || 'Failed to delete source');
    }
  }
);

const initialState = {
  items: [],
  activeKnowledge: null,
  isLoading: false,
  error: null
};

const knowledgeSlice = createSlice({
  name: 'knowledge',
  initialState,
  reducers: {
    setKnowledge: (state, action) => {
      state.items = action.payload;
    },
    setActiveKnowledge: (state, action) => {
      state.activeKnowledge = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchKnowledge
      .addCase(fetchKnowledge.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchKnowledge.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload && action.payload.preference_value) {
          state.items = action.payload.preference_value;
        } else {
          state.items = [];
        }
      })
      .addCase(fetchKnowledge.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // createKnowledge
      .addCase(createKnowledge.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createKnowledge.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(createKnowledge.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // updateKnowledge
      .addCase(updateKnowledge.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateKnowledge.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(updateKnowledge.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // deleteKnowledge
      .addCase(deleteKnowledge.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteKnowledge.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(deleteKnowledge.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // addSource
      .addCase(addSource.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addSource.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(addSource.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // deleteSource
      .addCase(deleteSource.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteSource.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(deleteSource.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  }
});

// Export actions
export const {
  setKnowledge,
  setActiveKnowledge,
  clearError
} = knowledgeSlice.actions;

// Export selectors
export const selectKnowledge = (state) => state.knowledge.items;
export const selectActiveKnowledge = (state) => {
  const activeId = state.knowledge.activeKnowledge;
  if (activeId) {
    return state.knowledge.items.find(k => k.knowledge_id === activeId);
  }
  return null;
};
export const selectKnowledgeLoading = (state) => state.knowledge.isLoading;
export const selectKnowledgeError = (state) => state.knowledge.error;

// Export reducer
export default knowledgeSlice.reducer;