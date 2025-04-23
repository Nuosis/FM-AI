import { createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

// Memoized selector for llm preferences
export const selectLlmPreferences = createSelector(
  state => state.llm,
  state => state.auth.user,
  (llm, user) => {
    // Get the default provider from user preferences if available, otherwise use the one from llm state
    const defaultProvider = user?.preferences?.llm_preferences?.defaultProvider || llm.defaultProvider;
    
    // Get provider configurations from user preferences
    const llmProviders = user?.preferences?.llm_providers || [];
    
    // Find the provider configuration for the default provider
    const providerConfig = llmProviders.find(p =>
      p?.provider?.toLowerCase() === defaultProvider?.toLowerCase()
    );
// Removed console.log to prevent excessive logging

  
    // Extract models and baseUrl from provider configuration
    let strongModel = '';
    let weakModel = '';
    let defaultEmbeddingModelLarge = '';
    let defaultEmbeddingModelSmall = '';
    let baseUrl = '';
    
    // Set default models based on provider configuration
    let defaultStrongModel = '';
    let defaultWeakModel = '';
    
    if (providerConfig) {
      // Extract chat models
      strongModel = providerConfig.models?.chat?.strong || '';
      weakModel = providerConfig.models?.chat?.weak || '';
      
      // Set default models using the same process as the model selection
      defaultStrongModel = strongModel;
      defaultWeakModel = weakModel;
      
      // Extract embedding models
      defaultEmbeddingModelLarge = providerConfig.models?.embedding?.large || '';
      defaultEmbeddingModelSmall = providerConfig.models?.embedding?.small || '';
      
      // Extract baseUrl
      baseUrl = providerConfig.baseUrl || '';
    }
    
    // Get system instructions and temperature from user preferences if available, otherwise use the ones from llm state
    const systemInstructions = user?.preferences?.llm_preferences?.systemInstructions || llm.systemInstructions;
    const temperature = user?.preferences?.llm_preferences?.temperature || llm.temperature;
    
    return {
      darkMode: llm.darkMode,
      defaultProvider: defaultProvider,
      preferredStrongModel: strongModel,
      preferredWeakModel: weakModel,
      defaultStrongModel: defaultStrongModel,
      defaultWeakModel: defaultWeakModel,
      defaultEmbeddingModelLarge: defaultEmbeddingModelLarge,
      defaultEmbeddingModelSmall,
      baseUrl: baseUrl,
      apiKeyStorage: llm.apiKeyStorage,
      systemInstructions: systemInstructions,
      temperature: temperature
    };
  }
);

const getInitialState = () => {
  // Default state - no longer reading from localStorage
  return {
    temperature: 0.7,
    systemInstructions: 'You are a helpful assistant.',
    model: '',
    darkMode: 'system', // 'system', 'dark', 'light'
    defaultProvider: 'openai', // 'openai', 'anthropic', 'gemini', 'lmStudio', 'ollama'
    defaultStrongModel: '',
    defaultWeakModel: '',
    defaultEmbeddingModelLarge: '',
    defaultEmbeddingModelSmall: '',
    apiKeyStorage: 'saved', // 'session', 'local', 'saved'
  };
};

const llmSlice = createSlice({
  name: 'llm',
  initialState: getInitialState(),
  reducers: {
    // DEBUG: Log every reducer call and state reference
    // eslint-disable-next-line no-unused-vars
    _debugLog: (state, action) => {
      console.log('[llmSlice] Reducer called. State reference:', state);
      return state;
    },
    // Replace the entire state with new values
    updateEntireState: (state, action) => {
      // We need to return a new state object with the payload values
      // but preserve any properties that might exist in state but not in payload
      return { ...state, ...action.payload };
    },
    // Special reducer for updating the entire state at once
    updateState: (state, action) => {
      console.log('[llmSlice] Updating entire state with:', action.payload);
      // Copy all properties from the payload to the state
      Object.keys(action.payload).forEach(key => {
        if (action.payload[key] !== undefined) {
          state[key] = action.payload[key];
        }
      });
    },
    setTemperature: (state, action) => {
      state.temperature = action.payload;
      // Removed localStorage.setItem
    },
    setSystemInstructions: (state, action) => {
      state.systemInstructions = action.payload;
      // Removed localStorage.setItem
    },
    setModel: (state, action) => {
      state.model = action.payload;
      // Removed localStorage.setItem
    },
    // New preference reducers
    setDarkMode: (state, action) => {
      state.darkMode = action.payload;
      // Removed localStorage.setItem
    },
    setDefaultProvider: (state, action) => {
      state.defaultProvider = action.payload;
      // Removed localStorage.setItem
    },
    setPreferredStrongModel: (state, action) => {
      state.preferredStrongModel = action.payload;
      // Removed localStorage.setItem
    },
    setPreferredWeakModel: (state, action) => {
      state.preferredWeakModel = action.payload;
      // Removed localStorage.setItem
    },
    setDefaultStrongModel: (state, action) => {
      state.defaultStrongModel = action.payload;
      // No localStorage.setItem needed
    },
    setDefaultWeakModel: (state, action) => {
      state.defaultWeakModel = action.payload;
      // No localStorage.setItem needed
    },
    setApiKeyStorage: (state, action) => {
      state.apiKeyStorage = action.payload;
      // Removed localStorage.setItem
    },
    deleteSavedApiKey: (state) => {
      // This action will trigger the deletion of the saved API key
      // The actual deletion will be handled in the component
      return state;
    }
  }
});

export const {
  setTemperature,
  setSystemInstructions,
  setModel,
  // New preference actions
  setDarkMode,
  setDefaultProvider,
  setPreferredStrongModel,
  setPreferredWeakModel,
  setDefaultStrongModel,
  setDefaultWeakModel,
  setApiKeyStorage,
  deleteSavedApiKey,
  updateEntireState,
  updateState
} = llmSlice.actions;

export default llmSlice.reducer;
