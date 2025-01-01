import { createSlice } from '@reduxjs/toolkit';
import { writeToLog } from '../../utils/logging';
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
  logs: []
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
      axios.post('/api/admin/logs/clear').catch(error => {
        console.error('Error clearing logs:', error);
      });
      state.logs = [];
    },
    setLogContent: (state, action) => {
      state.logs = action.payload;
    }
  }
});

// Export actions
export const {
  toggleVerbose,
  toggleLogViewer,
  addLog,
  clearLogs,
  setLogContent
} = appSlice.actions;

// Export selectors
export const selectIsVerboseEnabled = (state) => state.app.isVerboseEnabled;
export const selectShowLogViewer = (state) => state.app.showLogViewer;
export const selectLogs = (state) => state.app.logs;

// Thunk for handling log creation
export const createLog = (message, type = LogType.INFO) => async (dispatch) => {
  const result = await writeToLog(message, type);
  
  if (result.result === 'logged') {
    try {
      const response = await axios.get('/api/admin/logs/content');
      dispatch(setLogContent(response.data));
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  } else if (result.result === 'error') {
    console.error('Error writing log:', result.error);
  }
};

export default appSlice.reducer;
