import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { writeToLog, readLogs, clearLogs as clearLogFile } from '../../utils/logging';
import axios from 'axios';
import supabase from '../../utils/supabase';
import { setSession, logoutSuccess, restoreUserFromSession } from '../slices/authSlice';
import { fetchDataSources } from '../slices/dataStoreSlice';
import { syncLlmWithPreferences } from '../slices/llmSlice';
import { fetchTools } from '../slices/toolsSlice';
import { fetchOrgLicenses } from '../slices/licenseSlice';

export const LogType = {
  INFO: 'info',
  WARNING: 'warning',
  DEBUG: 'debug',
  ERROR: 'error'
};

const initialState = {
  isVerboseEnabled: false,
  showLogViewer: false,
  logs: [],
  serverHealth: {
    status: 'unknown', // 'healthy', 'unhealthy', 'unknown'
    lastChecked: null
  },
  initialization: {
    status: 'idle', // 'idle', 'loading', 'succeeded', 'failed'
    error: null
  }
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    toggleVerbose: (state) => {
      state.isVerboseEnabled = !state.isVerboseEnabled;
    },
    toggleLogViewer: (state) => {
      state.showLogViewer = !state.showLogViewer;
    },
    addLog: (state, action) => {
      const { message, type } = action.payload;
      state.logs.push({
        timestamp: new Date().toISOString(),
        message,
        type
      });
    },
    clearLogs: (state) => {
      clearLogFile();
      state.logs = [];
    },
    setLogContent: (state, action) => {
      state.logs = action.payload;
    },
    setServerHealth: (state, action) => {
      state.serverHealth = {
        status: action.payload.status,
        lastChecked: new Date().toISOString()
      };
    },
    setInitializationStatus: (state, action) => {
      state.initialization.status = action.payload;
    },
    setInitializationError: (state, action) => {
      state.initialization.error = action.payload;
      state.initialization.status = 'failed';
    },
    clearInitializationError: (state) => {
      state.initialization.error = null;
    }
  }
});

// Export actions
export const {
  toggleVerbose,
  toggleLogViewer,
  addLog,
  clearLogs,
  setLogContent,
  setServerHealth,
  setInitializationStatus,
  setInitializationError,
  clearInitializationError
} = appSlice.actions;

// Export selectors
export const selectIsVerboseEnabled = (state) => state.app.isVerboseEnabled;
export const selectShowLogViewer = (state) => state.app.showLogViewer;
export const selectLogs = (state) => state.app.logs;
export const selectServerHealth = (state) => state.app.serverHealth;
export const selectInitialization = (state) => state.app.initialization;

// Thunk for checking server health
export const checkServerHealth = () => async (dispatch) => {
  try {
    // console.log('Checking server health...');
    // Create clean axios instance without auth headers
    const cleanAxios = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL
    });
    const response = await cleanAxios.get('/health');
    
    if (!response.data.status || response.data.status !== 'healthy') {
      throw new Error('Invalid response from health endpoint');
    }
    
    dispatch(setServerHealth({ status: 'healthy' }));
  } catch (error) {
    console.error('Health check failed:', error);
    dispatch(setServerHealth({ status: 'unhealthy' }));
  }
};

// Thunk for handling log creation
export const createLog = (message, type = LogType.INFO) => async (dispatch) => {
  // Always add to Redux state first
  dispatch(addLog({ message, type }));
  
  // Write to local log file
  try {
    const result = await writeToLog(message, type);
    if (result.result === 'logged') {
      const logs = readLogs();
      dispatch(setLogContent(logs));
    } else if (result.result === 'error') {
      console.error('Error writing log to file:', result.error);
    }
  } catch (error) {
    console.error('Error in logging process:', error);
  }
};

/**
 * Centralized app initialization thunk
 * This thunk orchestrates the entire app initialization flow:
 * 1. Check and restore session
 * 2. Restore user data if needed
 * 3. Initialize dataStore, llm, and tools
 */
export const initializeApp = createAsyncThunk(
  'app/initializeApp',
  async (_, { dispatch, getState }) => {
    dispatch(setInitializationStatus('loading'));
    dispatch(createLog('Starting app initialization sequence', LogType.INFO));
    
    try {
      // Step 1: Check session
      dispatch(createLog('Step 1: Checking authentication session', LogType.INFO));
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        throw new Error(`Session check failed: ${error.message}`);
      }
      
      // If no session, ensure Redux state reflects logged out state
      if (!data.session) {
        dispatch(logoutSuccess());
        dispatch(createLog('No active session found', LogType.INFO));
        dispatch(setInitializationStatus('succeeded'));
        return { authenticated: false };
      }
      
      // If session exists, update Redux state with session
      dispatch(setSession(data.session));
      dispatch(createLog('Active session restored', LogType.INFO));
      
      // Step 2: Restore user data if needed
      const state = getState();
      if (state.auth.session && !state.auth.user) {
        dispatch(createLog('Step 2: Restoring user state', LogType.INFO));
        await dispatch(restoreUserFromSession()).unwrap();
        dispatch(createLog('User state restored successfully', LogType.INFO));
      }
      
      // Step 3: Initialize other state slices sequentially after auth is complete
      dispatch(createLog('Step 3: Initializing app state (dataStore, llm, tools)', LogType.INFO));
      
      try {
        // Initialize data store
        dispatch(createLog('Initializing Data Store...', LogType.INFO));
        await dispatch(fetchDataSources()).unwrap();
        dispatch(createLog('Data Store initialized successfully', LogType.INFO));
        
        // Sync LLM with preferences
        dispatch(createLog('Syncing LLM with preferences...', LogType.INFO));
        await dispatch(syncLlmWithPreferences()).unwrap();
        dispatch(createLog('LLM state synced with preferences', LogType.INFO));
        
        // Fetch tools
        dispatch(createLog('Fetching tools...', LogType.INFO));
        await dispatch(fetchTools()).unwrap();
        dispatch(createLog('Tools fetched successfully', LogType.INFO));
        
        // Fetch licenses
        dispatch(createLog('Fetching licenses...', LogType.INFO));
        const licenseResult = await dispatch(fetchOrgLicenses()).unwrap();
        dispatch(createLog(
          `Licenses fetched successfully. Active license: ${licenseResult.activeLicenseId}`,
          LogType.INFO
        ));
      } catch (error) {
        dispatch(createLog(`Error during state initialization: ${error.message}`, LogType.ERROR));
        // We continue despite errors to ensure the app can still function
      }
      
      dispatch(createLog('App initialization completed successfully', LogType.INFO));
      dispatch(setInitializationStatus('succeeded'));
      return { authenticated: true };
      
    } catch (error) {
      dispatch(createLog(`App initialization failed: ${error.message}`, LogType.ERROR));
      dispatch(setInitializationError(error.message));
      throw error;
    }
  }
);

export default appSlice.reducer;
