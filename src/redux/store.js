import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import licenseReducer from './slices/licenseSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    license: licenseReducer,
    auth: authReducer,
  },
});

export default store;
