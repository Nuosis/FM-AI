{/* NB: NOTE
  * llmSlice.js manages the active state of llm and its models in the current context.
  * It is used to set the active model and provider for the current user and component.
  * It derives from user preferences (auth.user.preferecnes) but NEVER pushs to auth.user.preferences.
  * User preferences are changed and managed in the Setting Component and by the authSlice.
*/}



import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

// Async thunk to sync LLM state with user preferences
export const syncLlmWithPreferences = createAsyncThunk(
  'llm/syncLlmWithPreferences',
  async (_, { getState, dispatch }) => {
    console.log('[LlmSlice] Syncing LLM state with user preferences...');
    const state = getState(); 
    const llmState = state.llm;
    const userPreferences = state.auth.user?.preferences || {};
    const llmPreferences = userPreferences.llm_preferences || {};
    const llmProviders = userPreferences.llm_providers || [];

    // console.log('[LlmSlice] state:', state);
    // console.log('[LlmSlice] User preferences:', userPreferences);
    // console.log('[LlmSlice] LLM preferences:', llmPreferences);
    // console.log('[LlmSlice] LLM providers:', llmProviders);
    
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
      // Initialize activeProvider with defaultProvider if it's not already set
      activeProvider: llmState.activeProvider || defaultProvider,
      activeModel: llmState.activeModel || weakModel,
      activeWeakModel: llmState.activeWeakModel || weakModel,
      activeStrongModel: llmState.activeStrongModel || strongModel,
      activeEmbeddingModelLarge: llmState.activeEmbeddingModelLarge || defaultEmbeddingModelLarge,
      activeEmbeddingModelSmall: llmState.activeEmbeddingModelSmall || defaultEmbeddingModelSmall,
      activeBaseUrl: llmState.activeBaseUrl || baseUrl,
      // Initialize defaults from state.auth.user.preferences
      defaultProvider: defaultProvider,
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

    // console.log('[LlmSlice] Updated LLM state:', updatedState);

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
    
    // Get active provider and model from user preferences if available, otherwise use the default ones
    const activeProvider = user?.preferences?.llm_preferences?.activeProvider || defaultProvider;
    // Use state.llm.activeModel if available, otherwise fall back to preferences
    const activeModel = llm.activeModel || user?.preferences?.llm_preferences?.activeModel || defaultWeakModel;
    
    return {
      darkMode: llm.darkMode,
      defaultProvider: defaultProvider,
      activeProvider: activeProvider,
      defaultStrongModel: defaultStrongModel,
      defaultWeakModel: defaultWeakModel,
      activeModel: activeModel,
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
  state => state.llm,
  (llmState) => {
    return [
      llmState.activeStrongModel,
      llmState.activeWeakModel
    ].filter(Boolean);
  }
);

// Selector for active provider
export const selectActiveProvider = createSelector(
  state => {
    const llmPreferences = state.auth.user?.preferences?.llm_preferences || {};
    return state.llm.activeProvider  || llmPreferences.defaultProvider;
  },
  (activeProvider) => activeProvider
);

// Selector for weak model
export const selectWeakModel = createSelector(
  state => state.llm.defaultWeakModel,
  (defaultWeakModel) => defaultWeakModel
);

// Selector for strong model
export const selectStrongModel = createSelector(
  state => state.llm.defaultStrongModel,
  (defaultStrongModel) => defaultStrongModel
);

// Selector for activeModel
export const selectActiveModel = createSelector(
  state => state.llm.activeModel,
  (activeModel) => activeModel
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
    defaultProvider: 'openAI', // 'openai', 'anthropic', 'gemini', 'lmStudio', 'ollama'
    activeProvider: '', // Currently active provider being used in the UI
    activeModel: '', // Currently active model being used
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
    },
    setSystemInstructions: (state, action) => {
      state.systemInstructions = action.payload;
    },
    setDarkMode: (state, action) => {
      state.darkMode = action.payload;
    },
    setDefaultProvider: (state, action) => {
      state.defaultProvider = action.payload;
    },
    setDefaultStrongModel: (state, action) => {
      state.defaultStrongModel = action.payload;
    },
    setDefaultWeakModel: (state, action) => {
      state.defaultWeakModel = action.payload;
    },
    setApiKeyStorage: (state, action) => {
      state.apiKeyStorage = action.payload;
    },
    deleteSavedApiKey: (state) => {
      // This action will trigger the deletion of the saved API key
      // The actual deletion will be handled in the component
      return state;
    },
    setActiveModel: (state, action) => {
      state.activeModel = action.payload;
    },
    setActiveProvider: (state, action) => {
      state.activeProvider = action.payload;
    }
  }
});

export const {
  setTemperature,
  setSystemInstructions,
  setDarkMode,
  setDefaultProvider,
  setDefaultStrongModel,
  setDefaultWeakModel,
  setApiKeyStorage,
  deleteSavedApiKey,
  updateEntireState,
  updateState,
  setActiveModel,
  setActiveProvider
} = llmSlice.actions;



// Create the setActiveModel thunk
export const setActiveModelThunk = createAsyncThunk(
  'llm/setActiveModelThunk',
  async (modelName, { dispatch }) => {
    console.log('[LlmSlice] Setting active model to:', modelName);
    
    // Update the activeModel in the state
    dispatch(setActiveModel(modelName));
    
    // Return the updated model name
    return modelName;
  }
);

// Create the setActiveProvider thunk
export const setActiveProviderThunk = createAsyncThunk(
  'llm/setActiveProviderThunk',
  async (providerName, { dispatch, getState }) => {
    console.log('[LlmSlice] Setting active provider to:', providerName);
    const state = getState(); 
    const userPreferences = state.auth.user?.preferences || {};
    
    // Update the activeProvider in the state
    // dispatch(setActiveProvider(providerName));
    
    // Sync LLM state with user preferences to update models
    // await dispatch(syncLlmWithPreferences());
    const llmProviders = userPreferences.llm_providers || [];
    const providerConfig = llmProviders.find(p =>
      p?.provider?.toLowerCase() === providerName?.toLowerCase()
    );

    console.log('[LlmSlice] Provider configuration:', providerConfig);

    // Extract models and other settings
    let strongModel = '';
    let weakModel = '';
    let embeddingModelLarge = '';
    let embeddingModelSmall = '';
    let baseUrl = '';
    
    if (providerConfig) {
      strongModel = providerConfig.models?.chat?.strong || '';
      weakModel = providerConfig.models?.chat?.weak || '';
      embeddingModelLarge = providerConfig.models?.embedding?.large || '';
      embeddingModelSmall = providerConfig.models?.embedding?.small || '';
      baseUrl = providerConfig.baseUrl || '';
    }

    // Create updated state object
    const updatedState = {
      activeProvider: providerName,
      activeModel: weakModel,
      activeWeakModel: weakModel,
      activeStrongModel: strongModel,
      activeEmbeddingModelLarge: embeddingModelLarge,
      activeEmbeddingModelSmall: embeddingModelSmall,
      activeBaseUrl: baseUrl
    };

    // Update the state
    dispatch(updateState(updatedState));

    return providerName;
  }
);

// Export the reducer with the extra reducers for the thunk
export const llmReducer = llmSlice.reducer;

// Export the reducer as default as well
export default llmReducer;
