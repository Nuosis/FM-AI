import { createSlice } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';

// Memoized selector for llm preferences
export const selectLlmPreferences = createSelector(
  state => state.llm,
  llm => ({
    darkMode: llm.darkMode,
    defaultProvider: llm.defaultProvider,
    preferredStrongModel: llm.preferredStrongModel,
    preferredWeakModel: llm.preferredWeakModel,
    apiKeyStorage: llm.apiKeyStorage
  })
);

const getInitialState = () => {
  const storedState = localStorage.getItem('llmSettings');
  if (storedState) {
    return JSON.parse(storedState);
  }
  return {
    temperature: 0.7,
    systemInstructions: 'You are a helpful assistant.',
    provider: '',
    model: '',
    // New preferences
    darkMode: 'system', // 'system', 'dark', 'light'
    defaultProvider: 'openAI', // 'openAI', 'anthropic', 'gemini', 'lmStudio', 'ollama'
    preferredStrongModel: '',
    preferredWeakModel: '',
    apiKeyStorage: 'local', // 'session', 'local', 'saved'
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
    setTemperature: (state, action) => {
      state.temperature = action.payload;
      localStorage.setItem('llmSettings', JSON.stringify(state));
    },
    setSystemInstructions: (state, action) => {
      state.systemInstructions = action.payload;
      localStorage.setItem('llmSettings', JSON.stringify(state));
    },
    setProvider: (state, action) => {
      state.provider = action.payload;
      localStorage.setItem('llmSettings', JSON.stringify(state));
    },
    setModel: (state, action) => {
      state.model = action.payload;
      localStorage.setItem('llmSettings', JSON.stringify(state));
    },
    // New preference reducers
    setDarkMode: (state, action) => {
      state.darkMode = action.payload;
      localStorage.setItem('llmSettings', JSON.stringify(state));
    },
    setDefaultProvider: (state, action) => {
      state.defaultProvider = action.payload;
      localStorage.setItem('llmSettings', JSON.stringify(state));
    },
    setPreferredStrongModel: (state, action) => {
      state.preferredStrongModel = action.payload;
      localStorage.setItem('llmSettings', JSON.stringify(state));
    },
    setPreferredWeakModel: (state, action) => {
      state.preferredWeakModel = action.payload;
      localStorage.setItem('llmSettings', JSON.stringify(state));
    },
    setApiKeyStorage: (state, action) => {


      state.apiKeyStorage = action.payload;
      localStorage.setItem('llmSettings', JSON.stringify(state));
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
  setProvider,
  setModel,
  // New preference actions
  setDarkMode,
  setDefaultProvider,
  setPreferredStrongModel,
  setPreferredWeakModel,
  setApiKeyStorage,
  deleteSavedApiKey
} = llmSlice.actions;

export default llmSlice.reducer;
