import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createLog, LogType } from './appSlice';
import axios from '../../utils/axios';

export const fetchOrgLicenses = createAsyncThunk(
  'license/fetchOrgLicenses',
  async (_, { dispatch }) => {
    // Get org_id from Redux auth state
    const orgId = import.meta.env.VITE_PUBLIC_KEY;
    if (!orgId) {
      throw new Error('No organization ID set');
    }
    dispatch(createLog(`Fetching organization licenses ${orgId}`, LogType.DEBUG));
    
    try {
      const response = await axios.get(`/api/admin/licenses/?org_id=${orgId}`, {
        headers: {
          'Authorization': `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
        }
      });
      
      const data = response.data;
      
      dispatch(createLog(`Licenses data: ${JSON.stringify(data)}`, LogType.DEBUG));
      
      // Filter for active license matching org_id and f_active=1
      const activeLicense = data.find(license => 
        license.fieldData._orgID === orgId && 
        license.fieldData.f_active === 1
      );
      console.log({activeLicense})

      dispatch(createLog(`Active license set to: ${activeLicense?.fieldData.__ID}`, LogType.DEBUG));
      
      return {
        licenses: data,
        activeLicenseId: activeLicense?.fieldData.__ID
      };
    } catch (error) {
      dispatch(createLog(`License fetch error: ${error.message}`, LogType.ERROR));
      throw error;
    }
  }
);

const initialState = {
  searchQuery: '',
  sortConfig: {
    field: 'dateEnd',
    direction: 'asc'
  },
  notification: null,
  // License state
  licenses: [],
  activeLicenseId: null,
  status: 'idle',
  error: null
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrgLicenses.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchOrgLicenses.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.licenses = action.payload.licenses;
        state.activeLicenseId = action.payload.activeLicenseId;
        state.error = null;
      })
      .addCase(fetchOrgLicenses.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  }
});

export const {
  setSearchQuery,
  setSortConfig,
  setNotification,
  clearNotification
} = licenseSlice.actions;

// Selectors with memoization
import { createSelector } from '@reduxjs/toolkit';

export const selectLicenseState = (state) => state.license;

export const selectLicenses = createSelector(
  [selectLicenseState],
  (license) => license.licenses
);

export const selectActiveLicenseId = createSelector(
  [selectLicenseState],
  (license) => license.activeLicenseId
);

export const selectActiveLicense = createSelector(
  [selectLicenses, selectActiveLicenseId],
  (licenses, activeLicenseId) => 
    licenses.find(license => license.fieldData.__ID === activeLicenseId)
);

export const selectLicenseStatus = createSelector(
  [selectLicenseState],
  (license) => license.status
);

export const selectLicenseError = createSelector(
  [selectLicenseState],
  (license) => license.error
);

export const selectSearchQuery = createSelector(
  [selectLicenseState],
  (license) => license.searchQuery
);

export const selectSortConfig = createSelector(
  [selectLicenseState],
  (license) => license.sortConfig
);

export const selectNotification = createSelector(
  [selectLicenseState],
  (license) => license.notification
);

export default licenseSlice.reducer;
