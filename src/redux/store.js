import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import authReducer from './slices/authSlice';
import licenseReducer from './slices/licenseSlice';
import llmReducer from './slices/llmSlice';
import toolsReducer from './slices/toolsSlice';
import dataStoreReducer from './slices/dataStoreSlice';
import knowledgeReducer from './slices/knowledgeSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
    license: licenseReducer,
    llm: llmReducer,
    tools: toolsReducer,
    dataStore: dataStoreReducer,
    knowledge: knowledgeReducer,
  },
});

// Expose store to window object for debugging
if (import.meta.env.DEV) {
  window.reduxStore = store;
  
  // Add a helper function to get the current state
  window.getReduxState = () => store.getState();
  
  // Log initial state to console
  console.log('Initial Redux State:', store.getState());
  
  // Subscribe to state changes and update window object
  store.subscribe(() => {
    window.reduxState = store.getState();
    //console.log('Redux State Updated:', window.reduxState);
  });
}

export default store;
