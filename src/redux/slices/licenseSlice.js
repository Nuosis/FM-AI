import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  searchQuery: '',
  sortConfig: {
    field: 'dateEnd',
    direction: 'asc'
  },
  notification: null
};

const licenseSlice = createSlice({
  name: 'license',
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setSortConfig: (state, action) => {
      state.sortConfig = action.payload;
    },
    setNotification: (state, action) => {
      state.notification = action.payload;
    },
    clearNotification: (state) => {
      state.notification = null;
    }
  }
});

export const {
  setSearchQuery,
  setSortConfig,
  setNotification,
  clearNotification
} = licenseSlice.actions;

// Selectors
export const selectSearchQuery = (state) => state.license.searchQuery;
export const selectSortConfig = (state) => state.license.sortConfig;
export const selectNotification = (state) => state.license.notification;

export default licenseSlice.reducer;
