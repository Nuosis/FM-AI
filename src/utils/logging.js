import axios from 'axios';
import store from '../redux/store';
import { selectIsVerboseEnabled } from '../redux/slices/appSlice';

// Only handles the actual writing of logs based on type and verbose mode
export const writeToLog = async (message, type) => {
  const isVerbose = selectIsVerboseEnabled(store.getState());
  
  // Only write if it's an ERROR or if verbose mode is enabled
  if (type === 'error' || isVerbose) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    
    try {
      await axios.post('/api/admin/logs', { 
        message: logMessage,
        type
      });
      return { result: 'logged', error: 0 };
    } catch (error) {
      console.error('Error writing to log file:', error);
      return { result: 'error', error: error.message || 'Unknown error' };
    }
  }
  
  return { result: 'blocked', error: 0 };
};
