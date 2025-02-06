# Authentication Implementation Guide

This guide outlines how to implement authentication in your frontend application using our backend service.

## Environment Setup

Required environment variables in your `.env`:

```
(production)
VITE_API_BASE_URL=https://clarity-backend-2w6n.onrender.com 
(developement)
VITE_API_BASE_URL=https://192.168.1.80:5001 
VITE_PUBLIC_KEY=your_org_id
VITE_API_JWT=your_api_jwt
VITE_API_KEY=your_api_key
```
run generate-jwt.js once correct PubKey is set to generate API_JWT and API_KEY

## Redux Auth Slice Implementation

1. Create `authSlice.js`:

```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: false,
  user: null,
  organizationId: null,
  loading: false,
  error: null,
  failedAttempts: 0,
  isLocked: false,
  lockoutExpiry: null,
  verifyingSession: false,
  licenseKey: {
    jwt: import.meta.env.VITE_API_JWT || null,
    privateKey: import.meta.env.VITE_API_KEY || null
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.loading = false;
      state.user = action.payload.user;
      state.organizationId = action.payload.user.org_id;
      state.error = null;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.failedAttempts += 1;
      
      if (state.failedAttempts >= 5 && !state.isLocked) {
        state.isLocked = true;
        state.lockoutExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
    },
    logoutSuccess: () => {
      const licenseKey = initialState.licenseKey;
      return { ...initialState, licenseKey };
    },
    setLicenseKey: (state, action) => {
      import.meta.env.VITE_PUBLIC_KEY
    },
    verifySessionStart: (state) => {
      state.verifyingSession = true;
    },
    verifySessionSuccess: (state, action) => {
      state.verifyingSession = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.organizationId = action.payload.user.org_id;
    },
    verifySessionFailure: (state) action) => {
      state.verifyingSession = false;
      state.isAuthenticated = false;
      state.user = null;
      state.organizationId = null;
    }
  }
});

export const {
  loginStart,
  loginSuccess, 
  loginFailure,
  logoutSuccess,
  setLicenseKey,
  verifySessionStart,
  verifySessionSuccess,
  verifySessionFailure
} = authSlice.actions;

export default authSlice.reducer;
```

2. Add to your Redux store:

```javascript
import authReducer from './slices/authSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    // other reducers...
  }
});
```

## Axios Utility Setup

Create `axios.js`:

```javascript
import axios from 'axios';
import { store } from '../redux/store';
import { showError } from '../redux/slices/errorSlice';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true
});

// Add request interceptor for logging
instance.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    
    store.dispatch(showError(`Error ${status}: ${message}`));
    return Promise.reject(error);
  }
);

export default instance;
```

## Authentication Endpoints

### Health Check Endpoints

1. Unprotected health check:
```javascript
GET /health
Response: { status: 'healthy' }
```

2. Token-protected health check:
```javascript
GET /api/auth/health/token
Headers: Cookie: access_token=<token>
Response: { status: 'healthy', auth: 'token' }
```

3. API key health check:
```javascript
GET /api/auth/health/apikey
Headers: Authorization: ApiKey <jwt>:<privateKey>
Response: { status: 'healthy', auth: 'apikey' }
```

### Authentication Flow

1. Registration Flow:

First, check if email exists for organization:
```javascript
POST /api/admin/email/find
Headers: Authorization: ApiKey <jwt>:<privateKey>
Body: {
  email: string,
  _orgID: string
}
Response: {
  data: [{
    fieldData: {
      _fkID: string // partyID if exists
    }
  }]
}
```

If email doesn't exist, create new party:
```javascript
POST /api/admin/party/
Headers: Authorization: ApiKey <jwt>:<privateKey>
Body: {
  firstName: string,
  lastName: string,
  displayName: string,
  _orgID: string,
  type: string
}
Response: {
  response: {
    data: [{
      fieldData: {
        __ID: string // new partyID
      }
    }]
  }
}
```

Then create email for new party:
```javascript
POST /api/admin/email/
Headers: Authorization: ApiKey <jwt>:<privateKey>
Body: {
  email: string,
  _fkID: string, // partyID from previous step
  _orgID: string //PUBLIC_KEY
}
```

Finally register user:
```javascript
POST /api/auth/register
Headers: Authorization: ApiKey <jwt>:<privateKey>
Body: {
  userName: string,
  password: string,
  _orgID: string, //PUBLIC_KEY
  _partyID: string, // from email check or party creation
  active_status: 'active' | 'inactive'
}
```

Example Registration Implementation:
```javascript
const register = async (formData) => {
  try {
    // Check if email exists
    const emailResponse = await axios.post('/api/admin/email/find', {
      email: formData.email,
      _orgID: formData._orgID
    }, {
      headers: {
        Authorization: `ApiKey ${API_JWT}:${API_KEY}`
      }
    });

    let partyID;
    
    if (emailResponse.status === 401) {
      // Email not found, create new party
      const partyResponse = await axios.post('/api/admin/party/', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: formData.displayName,
        _orgID: formData._orgID
      }, {
        headers: {
          Authorization: `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
        }
      });
      
      partyID = partyResponse.data.response.data[0].fieldData.__ID;
      
      // Create email for new party
      await axios.post('/api/admin/email/', {
        email: formData.email,
        _fkID: partyID,
        _orgID: import.meta.env.VITE_PUBLIC_KEY
      }, {
        headers: {
          Authorization: `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
        }
      });
    } else {
      // Email exists, get partyID
      partyID = emailResponse.data.data[0].fieldData._fkID;
    }

    // Register user
    await axios.post('/api/auth/register', {
      userName: formData.email,
      password: formData.password,
      _orgID: import.meta.env.VITE_PUBLIC_KEY,
      _partyID: partyID,
      active_status: 'active'
    }, {
      headers: {
        Authorization: `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
      }
    });
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};
```

2. Login:
```javascript
POST /api/auth/login
Headers: Authorization: Basic <base64(username:password)>
Body: { org_id: string }
Response: {
  user: {
    id: string,
    username: string,
    org_id: string,
    role: string
  },
  access_token: string
}
```

3. Validate Session:
```javascript
GET /api/auth/validate
Headers: Cookie: access_token=<token>
Response: {
  user: {
    id: string,
    username: string,
    org_id: string,
    role: string
  }
}
```

4. Logout:
```javascript
POST /api/auth/logout
Headers: Cookie: access_token=<token>
```

## Example Usage

1. Login Implementation:

```javascript
import { useDispatch } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '../redux/slices/authSlice';
import axios from '../utils/axios';

const login = async (username, password) => {
  const dispatch = useDispatch();
  
  try {
    dispatch(loginStart());
    
    const credentials = btoa(`${username}:${password}`);
    const response = await axios.post('/api/auth/login', 
      { org_id: import.meta.env.VITE_PUBLIC_KEY },
      { 
        headers: { 
          Authorization: `Basic ${credentials}` 
        }
      }
    );
    
    dispatch(loginSuccess(response.data));
  } catch (error) {
    dispatch(loginFailure(error.message));
  }
};
```

2. Protected Route Component:

```javascript
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, verifyingSession } = useSelector(state => state.auth);
  
  if (verifyingSession) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};
```

3. Session Validation:

```javascript
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { verifySessionStart, verifySessionSuccess, verifySessionFailure } from '../redux/slices/authSlice';
import axios from '../utils/axios';

const App = () => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    const validateSession = async () => {
      try {
        dispatch(verifySessionStart());
        const response = await axios.get('/api/auth/validate');
        dispatch(verifySessionSuccess(response.data));
      } catch (error) {
        dispatch(verifySessionFailure(error.message));
      }
    };
    
    validateSession();
  }, [dispatch]);
  
  return <div>App Content</div>;
};
```

4. Making Authenticated Requests:

```javascript
// The axios instance will automatically include credentials
const fetchProtectedData = async () => {
  try {
    const response = await axios.get('/api/protected-endpoint');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch protected data:', error);
    throw error;
  }
};
```

## Error Handling Setup

### Error Slice Implementation

Create `errorSlice.js`:

```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  message: null,
  open: false
};

const errorSlice = createSlice({
  name: 'error',
  initialState,
  reducers: {
    showError: (state, action) => {
      state.message = action.payload;
      state.open = true;
    },
    clearError: (state) => {
      state.open = false;
      state.message = null;
    }
  }
});

export const { showError, clearError } = errorSlice.actions;
export default errorSlice.reducer;
```

Add to your Redux store:

```javascript
import errorReducer from './slices/errorSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    error: errorReducer,
    // other reducers...
  }
});
```

### Universal Snackbar Component

Create a Material-UI Snackbar component that connects to the error slice:

```javascript
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { clearError } from '../../redux/slices/errorSlice';

const CustomSnackbar = () => {
  const dispatch = useDispatch();
  const { error } = useSelector((state) => state.error);

  const handleClose = () => {
    dispatch(clearError());
  };

  return (
    <Snackbar
      open={Boolean(error)}
      autoHideDuration={6000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert 
        onClose={handleClose} 
        severity="error"
        variant="filled"
        sx={{ width: '100%' }}
      >
        {error}
      </Alert>
    </Snackbar>
  );
};

export default CustomSnackbar;
```

Add the Snackbar to your app's root component:

```javascript
import CustomSnackbar from './components/Layout/Snackbar';

const App = () => {
  return (
    <>
      {/* Your app content */}
      <CustomSnackbar />
    </>
  );
};
```

### Using Error Handling

The error slice and Snackbar are automatically integrated with the axios interceptors to show API errors. You can also manually dispatch errors:

```javascript
import { useDispatch } from 'react-redux';
import { showError } from '../redux/slices/errorSlice';

const YourComponent = () => {
  const dispatch = useDispatch();

  const handleError = () => {
    dispatch(showError('Your error message here'));
  };

  return <div>Component content</div>;
};
```

## Test Component Implementation

### TestSecureApiCall Component

Create a component to test the authentication flow and API endpoints. This component should be mounted under the login form when the username is 'devCBS'.

```javascript
import { useEffect, useState } from 'react';
import { Box, Typography, Paper, List, ListItem, Button } from '@mui/material';
import axiosInstance from '../../utils/axios';
import { useDispatch } from 'react-redux';
import { createLog } from '../../redux/slices/appSlice';

const TestSecureApiCall = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const addResult = (step, data, isError = false) => {
    setResults(prev => [...prev, { step, data, isError, timestamp: new Date().toISOString() }]);
  };

  const checkHealth = async () => {
    try {
      dispatch(createLog('Testing /health endpoint', 'debug'));
      const response = await axiosInstance.get('/health');
      if (response.data.status !== 'healthy') {
        throw new Error('Health check failed');
      }
      addResult('Health Check', response.data);
      return true;
    } catch (error) {
      addResult('Health Check', error.message, true);
      return false;
    }
  };

  const registerTestUser = async () => {
    try {
      const formData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test.user@example.com',
        displayName: 'Test User',
        password: 'Password123!',
        _orgID: import.meta.env.VITE_PUBLIC_KEY
      };

      // Check if email exists
      const emailResponse = await axiosInstance.post('/api/admin/email/find', {
        email: formData.email,
        _orgID: formData._orgID
      }, {
        headers: {
          Authorization: `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
        }
      });

      let partyID;
      
      if (emailResponse.status === 401) {
        // Create new party
        const partyResponse = await axiosInstance.post('/api/admin/party/', {
          firstName: formData.firstName,
          lastName: formData.lastName,
          displayName: formData.displayName,
          _orgID: formData._orgID
        }, {
          headers: {
            Authorization: `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
          }
        });
        
        partyID = partyResponse.data.response.data[0].fieldData.__ID;
        
        // Create email
        await axiosInstance.post('/api/admin/email/', {
          email: formData.email,
          _fkID: partyID,
          _orgID: formData._orgID
        }, {
          headers: {
            Authorization: `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
          }
        });
      } else {
        partyID = emailResponse.data.data[0].fieldData._fkID;
      }

      // Register user
      await axiosInstance.post('/api/auth/register', {
        userName: formData.email,
        password: formData.password,
        _orgID: formData._orgID,
        _partyID: partyID,
        active_status: 'active'
      }, {
        headers: {
          Authorization: `ApiKey ${import.meta.env.VITE_API_JWT}:${import.meta.env.VITE_API_KEY}`
        }
      });

      addResult('Registration', 'Test user registered successfully');
      return true;
    } catch (error) {
      addResult('Registration', error.message, true);
      return false;
    }
  };

  const loginTestUser = async () => {
    try {
      const credentials = btoa('test.user@example.com:Password123!');
      const response = await axiosInstance.post('/api/auth/login', 
        { org_id: import.meta.env.VITE_PUBLIC_KEY },
        { headers: { Authorization: `Basic ${credentials}` } }
      );
      addResult('Login', 'Login successful');
      return true;
    } catch (error) {
      addResult('Login', error.message, true);
      return false;
    }
  };

  const checkTokens = () => {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [name, value] = cookie.trim().split('=');
      acc[name] = value;
      return acc;
    }, {});

    const hasAccessToken = 'access_token' in cookies;
    const hasRefreshToken = 'refresh_token' in cookies;

    addResult('Token Check', {
      accessToken: hasAccessToken ? 'Present' : 'Missing',
      refreshToken: hasRefreshToken ? 'Present' : 'Missing'
    }, !hasAccessToken || !hasRefreshToken);

    return hasAccessToken && hasRefreshToken;
  };

  const validateTokens = async () => {
    try {
      const [validateResponse, healthResponse] = await Promise.all([
        axiosInstance.get('/api/auth/validate'),
        axiosInstance.get('/api/auth/health/token')
      ]);

      addResult('Token Validation', {
        validate: validateResponse.data,
        health: healthResponse.data
      });
      return true;
    } catch (error) {
      addResult('Token Validation', error.message, true);
      return false;
    }
  };

  const logoutTestUser = async () => {
    try {
      await axiosInstance.post('/api/auth/logout');
      addResult('Logout', 'Logout successful');
    } catch (error) {
      addResult('Logout', error.message, true);
    }
  };

  useEffect(() => {
    const runTests = async () => {
      setLoading(true);
      
      // Run tests in sequence
      if (!await checkHealth()) return;
      if (!await registerTestUser()) return;
      if (!await loginTestUser()) return;
      if (!checkTokens()) return;
      await validateTokens();
      await logoutTestUser();
      
      setLoading(false);
    };

    runTests();
  }, []);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Auth Flow Test Results</Typography>
      
      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Typography>Running tests...</Typography>
        ) : (
          <List>
            {results.map((result, index) => (
              <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h6" color={result.isError ? 'error' : 'primary'}>
                  {result.step}
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'background.default', width: '100%' }}>
                  <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                  </Typography>
                </Paper>
                <Typography variant="caption" color="textSecondary">
                  {new Date(result.timestamp).toLocaleString()}
                </Typography>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default TestSecureApiCall;
```

### Integration with Login Form

Modify your login form to conditionally render the test component:

```javascript
const LoginForm = () => {
  const [username, setUsername] = useState('');
  // ... other state and handlers

  return (
    <div>
      {/* Your login form JSX */}
      
      {username === 'devCBS' && <TestSecureApiCall />}
    </div>
  );
};
```

The TestSecureApiCall component will:
1. Test the /health endpoint
2. Register a test user if needed
3. Login the test user (without setting site authorization)
4. Verify access_token and refresh_token cookies
5. Test /api/auth/validate and /api/auth/health/token endpoints
6. Logout the test user

Results are displayed in a clear, chronological list with timestamps and error highlighting. The component remains mounted and results persist until the username is changed from 'devCBS'.

## Security Notes

1. Always use HTTPS in production
2. Store sensitive tokens in HTTP-only cookies
3. Implement CSRF protection
4. Use environment variables for sensitive values
5. Implement rate limiting for failed login attempts
6. Validate all user input
7. Keep dependencies updated
