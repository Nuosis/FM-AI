import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

// Async thunk to sync LLM state with user preferences
export const syncLlmWithPreferences = createAsyncThunk(
  'llm/syncLlmWithPreferences',
  async (_, { getState, dispatch }) => {
    console.log('[LlmSlice] Syncing LLM state with user preferences...');
    const state = getState(); 
    /**
     * app: {isVerboseEnabled: false, showLogViewer: false, logs: [{timestamp: "2025-04-23T22:44:52.404Z", message: "Current auth state: {↵  \"isAuthenticated\": false,↵…ull,↵  \"session\": null,↵  \"isRefreshing\": false↵}", type: "debug"}, {timestamp: "2025-04-23T22:44:52.404Z", message: "Current auth state: {↵  \"isAuthenticated\": false,↵…ull,↵  \"session\": null,↵  \"isRefreshing\": false↵}", type: "debug"}, {timestamp: "2025-04-23T22:44:52.407Z", message: "Active session restored on startup", type: "info"}, {timestamp: "2025-04-23T22:44:52.408Z", message: "Current auth state: {↵  \"isAuthenticated\": true,↵ …mous\": false↵    }↵  },↵  \"isRefreshing\": false↵}", type: "debug"}, {timestamp: "2025-04-23T22:44:52.426Z", message: "Active session restored on startup", type: "info"}], serverHealth: {status: "unknown", lastChecked: null}}
     * auth: {isAuthenticated: true, user: null, loading: false, error: null, failedAttempts: 0, …}
     * functions: {items: [], isLoading: false, error: null}
     * license: {searchQuery: "", sortConfig: {field: "dateEnd", direction: "asc"}, notification: null, licenses: [], activeLicenseId: null, …
     * llm: Object
     *    apiKeyStorage: "saved"
     *    darkMode: "system"
     *    defaultEmbeddingModelLarge: ""
     *    defaultEmbeddingModelSmall: ""  
     *    defaultProvider: "openai"
     *    defaultStrongModel: ""
     *    defaultWeakModel: ""
     *    isLlmReady: false
     *    systemInstructions: "You are a helpful assistant."
     *    temperature: 0.7
     * tools: {items: [], isLoading: false, error: null, executionResult: null, executionError: null, …}
     */
    const llmState = state.llm;
    const userPreferences = state.auth.user?.preferences || {};
    const llmPreferences = userPreferences.llm_preferences || {};
    const llmProviders = userPreferences.llm_providers || [];

    console.log('[LlmSlice] state:', state);
    console.log('[LlmSlice] User preferences:', userPreferences);
    console.log('[LlmSlice] LLM preferences:', llmPreferences);
    console.log('[LlmSlice] LLM providers:', llmProviders);
    
    // Find the provider configuration for the default provider
    const defaultProvider = llmPreferences.defaultProvider || llmState.defaultProvider;
    const providerConfig = llmProviders.find(p =>
      p?.provider?.toLowerCase() === defaultProvider?.toLowerCase()
    );
    
    // Extract models and other settings
    let strongModel = '';
    let weakModel = '';
    let defaultEmbeddingModelLarge = '';
    let defaultEmbeddingModelSmall = '';
    let baseUrl = '';
    
    if (providerConfig) {
      strongModel = providerConfig.models?.chat?.strong || '';
      weakModel = providerConfig.models?.chat?.weak || '';
      defaultEmbeddingModelLarge = providerConfig.models?.embedding?.large || '';
      defaultEmbeddingModelSmall = providerConfig.models?.embedding?.small || '';
      baseUrl = providerConfig.baseUrl || '';
    }
    
    // Get system instructions and temperature
    const systemInstructions = llmPreferences.systemInstructions || llmState.systemInstructions;
    const temperature = llmPreferences.temperature || llmState.temperature;
    
    // Create updated state object
    const updatedState = {
      darkMode: llmState.darkMode,
      defaultProvider: defaultProvider,
      preferredStrongModel: strongModel,
      preferredWeakModel: weakModel,
      defaultStrongModel: strongModel,
      defaultWeakModel: weakModel,
      defaultEmbeddingModelLarge: defaultEmbeddingModelLarge,
      defaultEmbeddingModelSmall,
      baseUrl: baseUrl,
      apiKeyStorage: llmState.apiKeyStorage,
      systemInstructions: systemInstructions,
      temperature: temperature,
      isLlmReady: true
    };

    console.log('[LlmSlice] Updated LLM state:', updatedState);

    // Update the state
    dispatch(updateState(updatedState));
    
    return updatedState;
  }
);

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
      temperature: temperature,
      isLlmReady: llm.isLlmReady
    };
  }
);

// Selector for provider options
export const selectProviderOptions = createSelector(
  state => state.auth.user?.preferences?.llm_providers || [],
  (providers) => providers.map(p => p.provider)
);

// Selector for model options for the selected provider
export const selectModelOptions = createSelector(
  state => state.auth.user?.preferences?.llm_providers || [],
  state => state.llm.defaultProvider,
  (providers, defaultProvider) => {
    const providerConfig = providers.find(p =>
      p?.provider?.toLowerCase() === defaultProvider?.toLowerCase()
    );
    
    if (!providerConfig || !providerConfig.models || !providerConfig.models.chat) {
      return [];
    }
    
    return [
      providerConfig.models.chat.strong,
      providerConfig.models.chat.weak
    ].filter(Boolean);
  }
);

// Selector for active provider
export const selectActiveProvider = createSelector(
  state => state.llm.defaultProvider,
  (defaultProvider) => defaultProvider
);

// Selector for active model
export const selectActiveModel = createSelector(
  state => state.llm.defaultWeakModel,
  (defaultWeakModel) => defaultWeakModel
);

// Selector for isLlmReady
export const selectIsLlmReady = createSelector(
  state => state.llm.isLlmReady,
  (isLlmReady) => isLlmReady
);

const getInitialState = () => {
  // Default state - no longer reading from localStorage
  return {
    temperature: 0.7,
    systemInstructions: 'You are a helpful assistant.',
    darkMode: 'system', // 'system', 'dark', 'light'
    defaultProvider: 'openai', // 'openai', 'anthropic', 'gemini', 'lmStudio', 'ollama'
    defaultStrongModel: '',
    defaultWeakModel: '',
    defaultEmbeddingModelLarge: '',
    defaultEmbeddingModelSmall: '',
    apiKeyStorage: 'saved', // 'session', 'local', 'saved'
    isLlmReady: false, // New flag to indicate if LLM state is synced with preferences
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
    // setModel reducer removed - use defaultStrongModel or defaultWeakModel instead
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
  // setModel removed
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

// Export the reducer with the extra reducers for the thunk
export const llmReducer = llmSlice.reducer;

// Export the reducer as default as well
export default llmReducer;
