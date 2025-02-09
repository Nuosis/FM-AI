# Authentication Implementation Guide

This guide outlines how to implement JWT authentication in your frontend application using our backend service.

## Environment Setup

Required environment variables in your `.env`:

```
(production)
VITE_API_BASE_URL=https://clarity-backend-2w6n.onrender.com 
(development)
VITE_API_BASE_URL=https://192.168.1.80:5001 
VITE_PUBLIC_KEY=your_org_id
VITE_API_JWT=your_api_jwt
VITE_API_KEY=your_api_key
```

## Redux Auth Slice Implementation

The auth slice manages JWT tokens in memory to prevent XSS vulnerabilities:

```javascript
const initialState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  failedAttempts: 0,
  isLocked: false,
  lockoutExpiry: null,
  licenseId: null,
  // JWT-specific state
  accessToken: null,
  tokenExpiry: null,
  isRefreshing: false
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.licenseId = action.payload.licenseId;
      // Store JWT token and expiry
      state.accessToken = action.payload.accessToken;
      state.tokenExpiry = action.payload.tokenExpiry;
    },
    // Token management reducers
    setAccessToken: (state, action) => {
      state.accessToken = action.payload.token;
      state.tokenExpiry = action.payload.expiry;
    },
    clearAccessToken: (state) => {
      state.accessToken = null;
      state.tokenExpiry = null;
    },
    refreshStart: (state) => {
      state.isRefreshing = true;
    },
    refreshSuccess: (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.tokenExpiry = action.payload.tokenExpiry;
      state.isRefreshing = false;
    },
    refreshFailure: (state) => {
      state.isRefreshing = false;
      state.isAuthenticated = false;
      state.accessToken = null;
      state.tokenExpiry = null;
      state.user = null;
    }
  }
});
```

## Axios Utility Setup

The axios utility handles token management, automatic refresh, and authentication headers:

```javascript
import axios from 'axios';
import { store } from '../redux/store';
import {
  refreshStart,
  refreshSuccess,
  refreshFailure,
  logoutSuccess
} from '../redux/slices/authSlice';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  timeout: 60000
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Check if token needs refresh (< 1 minute until expiry)
const shouldRefreshToken = () => {
  const state = store.getState().auth;
  if (!state.tokenExpiry) return false;
  const expiryTime = new Date(state.tokenExpiry).getTime();
  const currentTime = Date.now();
  return (expiryTime - currentTime) < 60000;
};

// Refresh token function
const refreshToken = async () => {
  try {
    store.dispatch(refreshStart());
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    
    const { accessToken, tokenExpiry } = response.data;
    store.dispatch(refreshSuccess({ accessToken, tokenExpiry }));
    return accessToken;
  } catch (error) {
    store.dispatch(refreshFailure());
    store.dispatch(logoutSuccess());
    throw error;
  }
};

// Request interceptor for authentication
instance.interceptors.request.use(
  async (config) => {
    const state = store.getState().auth;
    const originalRequest = config;

    // Skip token handling for auth endpoints
    if (config.url?.includes('/auth/') && !config.url?.includes('/auth/refresh')) {
      return config;
    }

    if (state.accessToken) {
      if (shouldRefreshToken()) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const newToken = await refreshToken();
            isRefreshing = false;
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          } catch (error) {
            isRefreshing = false;
            processQueue(error, null);
            throw error;
          }
        } else {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return originalRequest;
          });
        }
      } else {
        originalRequest.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    }

    return originalRequest;
  }
);

// Response interceptor for error handling
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const config = error.config;
    
    if (status === 403 && !config.url?.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await refreshToken();
          isRefreshing = false;
          processQueue(null, newToken);
          config.headers.Authorization = `Bearer ${newToken}`;
          return instance(config);
        } catch (refreshError) {
          isRefreshing = false;
          processQueue(refreshError, null);
          return Promise.reject(refreshError);
        }
      } else {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          config.headers.Authorization = `Bearer ${token}`;
          return instance(config);
        });
      }
    }
    
    return Promise.reject(error);
  }
);
```

## Authentication Endpoints

### Login
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
  accessToken: string,
  tokenExpiry: string
}
```

### Refresh Token
```javascript
POST /auth/refresh
Headers: Authorization: Bearer <token>
Response: {
  accessToken: string,
  tokenExpiry: string
}
```

### Logout
```javascript
POST /api/auth/logout
Headers: Authorization: Bearer <token>
```

## Example Usage

### Login Implementation
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
    
    dispatch(loginSuccess({
      user: response.data.user,
      accessToken: response.data.accessToken,
      tokenExpiry: response.data.tokenExpiry
    }));
  } catch (error) {
    dispatch(loginFailure(error.message));
  }
};
```

### Protected Route Component
```javascript
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector(state => state.auth);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};
```

### Making Authenticated Requests
```javascript
// The axios instance will automatically handle token refresh and authentication
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

## Security Best Practices

1. Token Storage
   - Store JWT tokens in memory (Redux store) instead of localStorage/sessionStorage
   - Never persist tokens to prevent XSS attacks

2. Token Management
   - Implement automatic token refresh before expiration
   - Handle failed refresh attempts gracefully
   - Clear tokens on logout
   - Use proper Authorization headers (Bearer scheme)

3. Request Security
   - Use HTTPS in production
   - Implement CSRF protection
   - Rate limit authentication attempts
   - Validate all user input

4. Error Handling
   - Implement proper error handling for auth failures
   - Log security-related events
   - Provide clear user feedback

5. General Security
   - Keep dependencies updated
   - Use environment variables for sensitive values
   - Implement proper session management
   - Follow security headers best practices
