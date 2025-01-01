import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/appSlice';
import organizationReducer from './slices/organizationSlice';
import organizationEmailReducer from './slices/organizationEmailSlice';
import organizationAddressReducer from './slices/organizationAddressSlice';
import organizationLicenseReducer from './slices/organizationLicenseSlice';
import organizationModulesSelectedReducer from './slices/organizationModulesSelectedSlice';
import organizationPartyReducer from './slices/organizationPartySlice';
import organizationPhoneReducer from './slices/organizationPhoneSlice';
import organizationRecordDetailsReducer from './slices/organizationRecordDetailsSlice';
import organizationSellableReducer from './slices/organizationSellableSlice';
import licenseReducer from './slices/licenseSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    organization: organizationReducer,
    organizationEmail: organizationEmailReducer,
    organizationAddress: organizationAddressReducer,
    organizationLicense: organizationLicenseReducer,
    organizationModulesSelected: organizationModulesSelectedReducer,
    organizationParty: organizationPartyReducer,
    organizationPhone: organizationPhoneReducer,
    organizationRecordDetails: organizationRecordDetailsReducer,
    organizationSellable: organizationSellableReducer,
    license: licenseReducer,
    auth: authReducer,
  },
});

export default store;
