import store from '../redux/store';
import { selectIsVerboseEnabled } from '../redux/slices/appSlice';

const LOGS_STORAGE_KEY = 'app_logs';

// Mask sensitive data like keys and tokens
export const maskSensitiveData = (data) => {
  if (typeof data !== 'object' || data === null) return data;
  
  const sensitiveKeys = ['privateKey', 'apiKey', 'clientSecret', 'refreshToken', 'token', 'jwt'];
  const maskedData = { ...data };
  
  for (const key in maskedData) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
      if (typeof maskedData[key] === 'string') {
        const value = maskedData[key];
        maskedData[key] = value.length <= 8 
          ? `${value.slice(0, 2)}***${value.slice(-2)}`
          : `${value.slice(0, 4)}***${value.slice(-4)}`;
      }
    } else if (typeof maskedData[key] === 'object' && maskedData[key] !== null) {
      maskedData[key] = maskSensitiveData(maskedData[key]);
    }
  }
  
  return maskedData;
};

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
      // Mask any sensitive data before logging
      const maskedMessage = typeof message === 'object' 
        ? JSON.stringify(maskSensitiveData(message))
        : message;
        
      const logs = getStoredLogs();
      logs.push({
        ...newLog,
        message: maskedMessage
      });
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
