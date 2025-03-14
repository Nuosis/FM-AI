import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { Buffer } from 'buffer';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import axios from '../../utils/axios';
import { TestSecureApiCall } from './';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  checkLockoutExpiry
} from '../../redux/slices/authSlice';
import { createLog, LogType } from '../../redux/slices/appSlice';
import { fetchOrgLicenses, selectActiveLicenseId } from '../../redux/slices/licenseSlice';

// Test VITE environment variables
const requiredEnvVars = [
  'VITE_API_BASE_URL',
  'VITE_PUBLIC_KEY'
];

requiredEnvVars.forEach(varName => {
  const value = import.meta.env[varName];
  if (!value) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

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

  // Use ref to ensure license fetch only happens once
  const licenseInitialized = useRef(false);

  // Fetch license once on mount
  useEffect(() => {
    if (!licenseInitialized.current) {
      licenseInitialized.current = true;
      dispatch(createLog('Fetching licenses', LogType.DEBUG));
      dispatch(fetchOrgLicenses())
        .unwrap()
        .then(() => {
          dispatch(createLog('Licenses fetched successfully', LogType.DEBUG));
        });
    }

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
    // Skip password validation for dev test mode
    if (formData.email !== 'devCBS' && !formData.password) {
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

    // Ensure we have a valid license before proceeding
    if (!activeLicenseId) {
      dispatch(loginFailure('No valid license found. Please contact support.'));
      dispatch(createLog('Login blocked - no valid license', LogType.WARNING));
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

    try {
      const credentials = Buffer.from(`${formData.email}:${formData.password}`).toString('base64');
      
      const response = await axios.post('/api/auth/login', 
        { org_id: import.meta.env.VITE_PUBLIC_KEY },
        { 
          headers: {
            'Authorization': `Basic ${credentials}`,
          }
        }
      );

      const data = response.data;
      
      // Validate response data
      dispatch(createLog(`Login response received`, LogType.DEBUG));
      if (!data.user || !data.access_token) {
        throw new Error('Invalid response format');
      }

      if (!Array.isArray(data.user.modules)) {
        throw new Error('Invalid modules data');
      }

      // Extract token expiry from JWT
      let tokenExpiry;
      try {
        const payload = JSON.parse(Buffer.from(data.access_token.split('.')[1], 'base64').toString());
        tokenExpiry = new Date(payload.exp * 1000).toISOString();
      } catch (error) {
        throw new Error('Invalid token format');
      }

      dispatch(loginSuccess({
        user: data.user,
        accessToken: data.access_token,
        tokenExpiry,
        licenseId: data.user.org_id // Using org_id as licenseId since they represent the same thing
      }));
      
      dispatch(createLog('Login successful', LogType.INFO));
      onViewChange('functions');
    } catch (err) {
      const errorMessage = err.message || 'Unknown login error';
      dispatch(loginFailure(errorMessage));
      dispatch(createLog(`Login failed: ${errorMessage}`, LogType.ERROR));
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
        <Typography component="h1" variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
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
            <Button
              variant="outlined"
              onClick={handleCreateAccount}
              fullWidth
              sx={{
                textTransform: 'none'
              }}
            >
              Create Account
            </Button>
          </Box>
        </Box>
        <Box sx={{ position: 'relative', width: '100%', mt: 4 }}>
          {formData.email === 'devCBS' && (
            <Box sx={{ 
              width: '100%', 
              maxHeight: '400px', 
              overflowY: 'auto',
              mb: 20 // Add margin to avoid overlap with logo
            }}>
              <TestSecureApiCall />
            </Box>
          )}
          <Box 
            sx={{ 
              textAlign: 'center',
              position: 'fixed',
              bottom: 0,
              left: '240px',
              right: 0,
              padding: '20px',
              backgroundColor: 'background.default',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              zIndex: 1
            }}
            onClick={() => window.open('https://claritybusinesssolutions.ca', '_blank')}
          >
            <img 
              src="https://server.claritybusinesssolutions.ca/clarity/clarity192x192.png"
              alt="Clarity Logo"
              style={{ width: '90px', height: '90px', marginBottom: '16px' }}
            />
            <Box>
              <img 
                src="https://server.claritybusinesssolutions.ca/clarity/logoTextWht.png"
                alt="Clarity"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
                style={{ height: '37.5px', marginBottom: '8px' }}
              />
              <Typography 
                component="h2" 
                variant="h4" 
                sx={{ mb: 1, display: 'none' }}
              >
                Clarity
              </Typography>
            </Box>
            <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
              automation ☯︎ integration ☯︎ insight
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
