import { createSlice } from '@reduxjs/toolkit';
import { writeToLog, readLogs, clearLogs as clearLogFile } from '../../utils/logging';
import axios from 'axios';

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
  setServerHealth
} = appSlice.actions;

// Export selectors
export const selectIsVerboseEnabled = (state) => state.app.isVerboseEnabled;
export const selectShowLogViewer = (state) => state.app.showLogViewer;
export const selectLogs = (state) => state.app.logs;
export const selectServerHealth = (state) => state.app.serverHealth;

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

export default appSlice.reducer;
