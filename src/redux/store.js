import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import authReducer from './slices/authSlice';
import licenseReducer from './slices/licenseSlice';
import llmReducer from './slices/llmSlice';
import functionsReducer from './slices/functionsSlice';
import toolsReducer from './slices/toolsSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
    license: licenseReducer,
    llm: llmReducer,
    functions: functionsReducer,
    tools: toolsReducer,
  },
});

export default store;
