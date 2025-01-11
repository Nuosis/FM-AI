import store from '../redux/store';
import { selectIsVerboseEnabled } from '../redux/slices/appSlice';

const LOGS_STORAGE_KEY = 'app_logs';

const getStoredLogs = () => {
  try {
    const storedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
    return storedLogs ? JSON.parse(storedLogs) : [];
  } catch (error) {
    console.error('Error reading logs from localStorage:', error);
    return [];
  }
};

const setStoredLogs = (logs) => {
  try {
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Error writing logs to localStorage:', error);
  }
};

// Only handles the actual writing of logs based on type and verbose mode
export const writeToLog = async (message, type) => {
  const isVerbose = selectIsVerboseEnabled(store.getState());
  
  // Only write if it's an ERROR or if verbose mode is enabled
  if (type === 'error' || isVerbose) {
    const timestamp = new Date().toISOString();
    const newLog = {
      timestamp,
      type: type.toUpperCase(),
      message
    };
    
    try {
      const logs = getStoredLogs();
      logs.push(newLog);
      setStoredLogs(logs);
      return { result: 'logged', error: 0 };
    } catch (error) {
      console.error('Error writing to logs:', error);
      return { result: 'error', error: error.message || 'Unknown error' };
    }
  }
  
  return { result: 'blocked', error: 0 };
};

export const readLogs = () => {
  try {
    return getStoredLogs();
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
};

export const clearLogs = () => {
  try {
    localStorage.removeItem(LOGS_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing logs:', error);
    return false;
  }
};
