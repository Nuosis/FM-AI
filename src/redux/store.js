import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import authReducer from './slices/authSlice';
import licenseReducer from './slices/licenseSlice';
import llmReducer from './slices/llmSlice';
import functionsReducer from './slices/functionsSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
    license: licenseReducer,
    llm: llmReducer,
    functions: functionsReducer,
  },
});

export default store;
