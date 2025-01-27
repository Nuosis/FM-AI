import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  isLoading: false,
  error: null,
};

const functionsSlice = createSlice({
  name: 'functions',
  initialState,
  reducers: {
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
});

// Export actions
export const {
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
