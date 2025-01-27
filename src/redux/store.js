import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import licenseReducer from './slices/licenseSlice';
import authReducer from './slices/authSlice';
import llmReducer from './slices/llmSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    license: licenseReducer,
    auth: authReducer,
    llm: llmReducer,
  },
});

export default store;
