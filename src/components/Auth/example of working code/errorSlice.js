import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  message: null,
  open: false
};

const errorSlice = createSlice({
  name: 'error',
  initialState,
  reducers: {
    showError: (state, action) => {
      state.message = action.payload;
      state.open = true;
    },
    clearError: (state) => {
      state.open = false;
      state.message = null;
    }
  }
});

export const { showError, clearError } = errorSlice.actions;
export default errorSlice.reducer;
