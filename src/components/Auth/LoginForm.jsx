import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { Buffer } from 'buffer';
import tokenStorage from './services/tokenStorage';

// Test VITE environment variables
//console.log('Testing VITE env variables:');
const requiredEnvVars = [
  'VITE_API_BASE_URL',
  'VITE_PUBLIC_KEY'
];

requiredEnvVars.forEach(varName => {
  const value = import.meta.env[varName];
  //console.log(`${varName}: ${value ? '✓ loaded' : '✗ missing'}`);
  if (!value) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  CircularProgress,
  Alert,
  Link,
  Snackbar
} from '@mui/material';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  checkLockoutExpiry
} from '../../redux/slices/authSlice';
import { createLog, LogType } from '../../redux/slices/appSlice';
import { fetchOrgLicenses, selectActiveLicenseId } from '../../redux/slices/licenseSlice';

const LoginForm = ({ onViewChange }) => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const activeLicenseId = useSelector(selectActiveLicenseId);
  const { loading, error, isLocked, lockoutExpiry } = auth;

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    dispatch(createLog('Login form mounted', LogType.DEBUG));
    return () => {
      dispatch(createLog('Login form unmounted', LogType.DEBUG));
    };
  }, [dispatch]);

  // Check lockout status periodically
  useEffect(() => {
    if (isLocked) {
      const interval = setInterval(() => {
        dispatch(checkLockoutExpiry());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLocked, dispatch]);

  const validateForm = () => {
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    }
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      dispatch(createLog('Login form validation failed', LogType.WARNING));
    }
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(createLog('Login attempt initiated', LogType.INFO));
    
    if (!validateForm()) {
      return;
    }

    if (isLocked) {
      const remainingTime = new Date(lockoutExpiry) - new Date();
      if (remainingTime > 0) {
        const minutes = Math.ceil(remainingTime / 60000);
        dispatch(loginFailure(`Account is locked. Please try again in ${minutes} minutes.`));
        dispatch(createLog('Login attempt blocked due to account lockout', LogType.WARNING));
        return;
      }
    }

    dispatch(loginStart());
    dispatch(createLog('Login API call initiated', LogType.DEBUG));

    try {
      const credentials = Buffer.from(`${formData.email}:${formData.password}`).toString('base64');
      
      // Log request details for debugging
      dispatch(createLog(`Login request to: ${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, LogType.DEBUG));
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`,
        },
        body: JSON.stringify({ org_id: import.meta.env.VITE_PUBLIC_KEY })
      });

      // Log response status for debugging
      dispatch(createLog(`Login response status: ${response.status}`, LogType.DEBUG));

      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error || 'Login failed';
        dispatch(createLog(`Login error: ${errorMessage}`, LogType.ERROR));
        throw new Error(errorMessage);
      }

      // Log full response data for debugging
      dispatch(createLog(`Login response data: ${JSON.stringify(data)}`, LogType.DEBUG));

      // Validate response structure
      if (!data.access_token || !data.refresh_token || !data.user) {
        throw new Error('Invalid response format');
      }

      // Validate user object and log details
      dispatch(createLog(`User data: ${JSON.stringify(data.user)}`, LogType.DEBUG));
      
      if (!data.user.id || !data.user.org_id || !data.user.active_status) {
        throw new Error('Invalid user data');
      }

      // Fetch and set license data using Redux action
      try {
        await dispatch(fetchOrgLicenses()).unwrap();
        if (activeLicenseId) {
          data.licenseId = activeLicenseId;
        } else {
          dispatch(createLog('No active license found for organization', LogType.WARNING));
        }
      } catch (err) {
        dispatch(createLog(`Failed to fetch license ID: ${err.message}`, LogType.WARNING));
      }

      // Validate user is active
      if (data.user.active_status !== 'active') {
        throw new Error('User account is not active');
      }

      // Validate permitted modules
      if (!Array.isArray(data.user.permitted_modules)) {
        throw new Error('Invalid permitted modules data');
      }

      // submit to auth
      dispatch(loginSuccess(data));
      dispatch(createLog(`Auth data submitted: ${JSON.stringify(data)}`, LogType.DEBUG));

      // Store tokens in memory and localStorage, then start refresh monitoring
      tokenStorage.saveTokens(data.access_token, data.refresh_token, data.user);
      tokenStorage.refreshTokenIfNeeded(); // Initialize refresh monitoring
      dispatch(createLog('Login successful - tokens stored in memory and localStorage', LogType.INFO));
      onViewChange('functions');
    } catch (err) {
      const errorMessage = err.message || 'Unknown login error';
      dispatch(loginFailure(errorMessage));
      dispatch(createLog(`Login failed: ${errorMessage}`, LogType.ERROR));
      // Log additional error details if available
      if (err.response) {
        dispatch(createLog(`Response status: ${err.response.status}`, LogType.ERROR));
        dispatch(createLog(`Response data: ${JSON.stringify(err.response.data)}`, LogType.ERROR));
      }
    }
  };

  const getRemainingLockoutTime = () => {
    if (!isLocked || !lockoutExpiry) return null;
    const remaining = new Date(lockoutExpiry) - new Date();
    if (remaining <= 0) return null;
    const minutes = Math.ceil(remaining / 60000);
    return `Account is locked. Please try again in ${minutes} minutes.`;
  };

  const handleCreateAccount = () => {
    dispatch(createLog('Navigating to registration form', LogType.INFO));
    onViewChange('register');
  };

  return (
    <Container component="main" maxWidth="sm">
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => dispatch(loginFailure(null))}
      >
        <Alert severity="error" onClose={() => dispatch(loginFailure(null))}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={auth.isAuthenticated}
        autoHideDuration={6000}
      >
        <Alert severity="success">
          Successfully logged in
        </Alert>
      </Snackbar>
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Sign in to your account
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email"
            name="email"
            autoComplete="email"
            autoFocus
            value={formData.email}
            onChange={handleChange}
            disabled={loading || isLocked}
            error={!!validationErrors.email}
            helperText={validationErrors.email}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'transparent',
                '& input': {
                  '&:-webkit-autofill': {
                    WebkitBoxShadow: '0 0 0 100px rgba(18, 18, 18, 0.98) inset',
                    WebkitTextFillColor: '#fff'
                  }
                }
              }
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading || isLocked}
            error={!!validationErrors.password}
            helperText={validationErrors.password}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'transparent',
                '& input': {
                  '&:-webkit-autofill': {
                    WebkitBoxShadow: '0 0 0 100px rgba(18, 18, 18, 0.98) inset',
                    WebkitTextFillColor: '#fff'
                  }
                }
              }
            }}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {isLocked && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {getRemainingLockoutTime()}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ 
              mt: 3, 
              mb: 2,
              width: '100%' // Ensure button takes full width
            }}
            disabled={loading || isLocked}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
            ) : null}
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              component="span"
            >
              Don&apos;t have an account?{' '}
              <Link
                component="button"
                variant="body2"
                onClick={handleCreateAccount}
                sx={{ 
                  textDecoration: 'none',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'inherit',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                Create one
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

LoginForm.propTypes = {
  onViewChange: PropTypes.func.isRequired
};

export default LoginForm;
