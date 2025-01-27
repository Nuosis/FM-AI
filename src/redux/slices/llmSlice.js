import { createSlice } from '@reduxjs/toolkit';

const getInitialState = () => {
  const storedState = localStorage.getItem('llmSettings');
  if (storedState) {
    return JSON.parse(storedState);
  }
  return {
    temperature: 0.7,
    systemInstructions: 'You are a helpful assistant.',
    provider: '',
    model: ''
  };
};

const llmSlice = createSlice({
  name: 'llm',
  initialState: getInitialState(),
  reducers: {
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
    }
  }
});

export const {
  setTemperature,
  setSystemInstructions,
  setProvider,
  setModel
} = llmSlice.actions;

export default llmSlice.reducer;
