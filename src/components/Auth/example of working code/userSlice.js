import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../utils/axios';

const initialState = {
  parties: {},
  emails: {},
  phones: {},
  addresses: {},
  loading: false,
  error: null
};

// Helper to clean fieldData
const cleanFieldData = (fieldData) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(fieldData)) {
    if (!key.startsWith('~') || key === '~dapiRecordID') {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// Async Thunks
export const fetchUserData = createAsyncThunk(
  'user/fetchUserData',
  async ({ partyId, email }, { getState, rejectWithValue }) => {
    try {
      const { jwt, privateKey } = getState().auth.licenseKey;

      // Fetch party details
      const partyResponse = await axios.post('/api/admin/party/find',
        {
          __ID: partyId
        },
        {
          headers: {
            Authorization: `ApiKey ${jwt}:${privateKey}`
          }
        }
      );
      const partyData = partyResponse.data.data[0];

      // Fetch email
      const emailResponse = await axios.post('/api/admin/email/find', 
        {
          _orgID: import.meta.env.VITE_PUBLIC_KEY,
          email
        },
        {
          headers: {
            Authorization: `ApiKey ${jwt}:${privateKey}`
          }
        }
      );
      const emailData = emailResponse.data.data[0];

      // Fetch phone
      const phoneResponse = await axios.post('/api/admin/phone/find',
        {
          _fkID: partyId
        },
        {
          headers: {
            Authorization: `ApiKey ${jwt}:${privateKey}`
          }
        }
      );
      const phoneData = phoneResponse.data.data[0];

      // Fetch address
      const addressResponse = await axios.post('/api/admin/address/find',
        {
          _fkID: partyId
        },
        {
          headers: {
            Authorization: `ApiKey ${jwt}:${privateKey}`
          }
        }
      );
      const addressData = addressResponse.data.data[0];

      return {
        party: cleanFieldData(partyData.fieldData),
        email: emailData ? cleanFieldData(emailData.fieldData) : null,
        phone: phoneData ? cleanFieldData(phoneData.fieldData) : null,
        address: addressData ? cleanFieldData(addressData.fieldData) : null
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const createParty = createAsyncThunk(
  'user/createParty',
  async (partyData, { getState }) => {
    const { jwt, privateKey } = getState().auth.licenseKey;
    const response = await axios.post('/api/admin/party/', 
      {
        firstName: partyData.firstName,
        lastName: partyData.lastName,
        displayName: `${partyData.firstName} ${partyData.lastName}`,
        _orgID: import.meta.env.VITE_PUBLIC_KEY,
        f_company: "0",
        type: "user"
      },
      {
        headers: {
          Authorization: `ApiKey ${jwt}:${privateKey}`
        }
      }
    );
    return response.data.response.data[0];
  }
);

export const createEmail = createAsyncThunk(
  'user/createEmail',
  async (emailData, { getState }) => {
    const { jwt, privateKey } = getState().auth.licenseKey;
    const response = await axios.post('/api/admin/email/',
      {
        email: emailData.email,
        _fkID: emailData.partyId,
        _orgID: import.meta.env.VITE_PUBLIC_KEY,
        f_primary: "1"
      },
      {
        headers: {
          Authorization: `ApiKey ${jwt}:${privateKey}`
        }
      }
    );
    return response.data.response.data[0];
  }
);

export const createPhone = createAsyncThunk(
  'user/createPhone',
  async (phoneData, { getState }) => {
    const { jwt, privateKey } = getState().auth.licenseKey;
    const response = await axios.post('/api/admin/phone/',
      {
        phone: phoneData.phone,
        _fkID: phoneData.partyId,
        f_primary: "1",
        label: "Primary"
      },
      {
        headers: {
          Authorization: `ApiKey ${jwt}:${privateKey}`
        }
      }
    );
    return response.data.response.data[0];
  }
);

export const createAddress = createAsyncThunk(
  'user/createAddress',
  async (addressData, { getState }) => {
    const { jwt, privateKey } = getState().auth.licenseKey;
    const response = await axios.post('/api/admin/address/',
      {
        streetAddress: addressData.streetAddress,
        city: addressData.city,
        prov: addressData.state,
        postalCode: addressData.postalCode,
        country: addressData.country,
        colonia: addressData.colonia,
        _fkID: addressData.partyId,
        type: "Home"
      },
      {
        headers: {
          Authorization: `ApiKey ${jwt}:${privateKey}`
        }
      }
    );
    return response.data.response.data[0];
  }
);

export const createPreference = createAsyncThunk(
  'user/communicationPreference',
  async (addressData, { getState }) => {
    const { jwt, privateKey } = getState().auth.licenseKey;
    const response = await axios.post('/api/admin/record_details/',
      {
        data: addressData.preferredContact,
        type: "communicationPref",
        _orgID: import.meta.env.VITE_PUBLIC_KEY,
        _fkID: addressData.partyId,
      },
      {
        headers: {
          Authorization: `ApiKey ${jwt}:${privateKey}`
        }
      }
    );
    return response.data.response.data[0];
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    setUserData: (state, action) => {
      const { party, email, phone, address } = action.payload;
      if (party) state.parties[party.__ID] = party;
      if (email) state.emails[email.__ID] = email;
      if (phone) state.phones[phone.__ID] = phone;
      if (address) state.addresses[address.__ID] = address;
    },
    addParty: (state, action) => {
      const party = action.payload;
      state.parties[party.fieldData.__ID] = party;
    },
    addEmail: (state, action) => {
      const email = action.payload;
      state.emails[email.fieldData.__ID] = email;
    },
    addPhone: (state, action) => {
      const phone = action.payload;
      state.phones[phone.fieldData.__ID] = phone;
    },
    addAddress: (state, action) => {
      const address = action.payload;
      state.addresses[address.fieldData.__ID] = address;
    },
    addCommProf: (state, action) => {
      const communicationPreference = action.payload;
      state.communicationPreference[communicationPreference.fieldData.data] = communicationPreference;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserData.fulfilled, (state, action) => {
        state.loading = false;
        const { party, email, phone, address } = action.payload;
        if (party) state.parties[party.__ID] = party;
        if (email) state.emails[email.__ID] = email;
        if (phone) state.phones[phone.__ID] = phone;
        if (address) state.addresses[address.__ID] = address;
      })
      .addCase(fetchUserData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createParty.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createParty.fulfilled, (state, action) => {
        state.loading = false;
        const party = action.payload;
        state.parties[party.fieldData.__ID] = party;
      })
      .addCase(createParty.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEmail.fulfilled, (state, action) => {
        state.loading = false;
        const email = action.payload;
        state.emails[email.fieldData.__ID] = email;
      })
      .addCase(createEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createPhone.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPhone.fulfilled, (state, action) => {
        state.loading = false;
        const phone = action.payload;
        state.phones[phone.fieldData.__ID] = phone;
      })
      .addCase(createPhone.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAddress.fulfilled, (state, action) => {
        state.loading = false;
        const address = action.payload;
        state.addresses[address.fieldData.__ID] = address;
      })
      .addCase(createAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createPreference.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPreference.fulfilled, (state, action) => {
        state.loading = false;
        const address = action.payload;
        state.addresses[address.fieldData.__ID] = address;
      })
      .addCase(createPreference.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export const {
  setLoading,
  setError,
  clearError,
  addParty,
  addEmail,
  addPhone,
  addAddress,
  addComPref
} = userSlice.actions;

export default userSlice.reducer;
