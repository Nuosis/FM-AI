import { createSlice } from '@reduxjs/toolkit';
import { writeToLog, readLogs, clearLogs as clearLogFile } from '../../utils/logging';

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
      clearLogFile();
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
