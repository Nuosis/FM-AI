import { useState } from 'react';
import supabase from '../../utils/supabase';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../redux/slices/authSlice';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  CircularProgress,
  Alert
} from '@mui/material';
import PropTypes from 'prop-types';

const inputStyles = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'transparent',
    '& input': {
      '&:-webkit-autofill': {
        WebkitBoxShadow: '0 0 0 100px rgba(18, 18, 18, 0.85) inset',
        WebkitTextFillColor: '#fff'
      }
    }
  }
};

const LoginForm = ({ onViewChange }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!formData.email || !formData.password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);

    // Check if we're in development environment
    const isDevelopment = import.meta.env.VITE_ENVIRONMENT?.toLowerCase() === 'development' ||
                          import.meta.env.MODE === 'development';
    
    // Check if auth mocking is enabled via environment variable
    const shouldMockAuth = isDevelopment &&
                          (import.meta.env.VITE_AD_AUTH_MOCK === 'true' ||
                           import.meta.env.VITE_AD_AUTH_MOCK === true);

    if (isDevelopment && shouldMockAuth) {
      // Simulate successful login in development mode when mocking is enabled
      setLoading(false);
      setSuccess(true);
      
      // Create mock session and user data
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() + 3600000, // 1 hour from now
      };
      
      const mockUser = {
        id: 'dev-user-id',
        email: formData.email,
        user_metadata: {
          full_name: 'Development User',
        },
        organization_id: '9816c057-b5d3-43a2-848f-99365ee6255e', // Using the org ID from .env
      };
      
      // Dispatch Redux action to update auth state
      dispatch(loginSuccess({
        session: mockSession,
        user: {
          ...mockUser,
          org_id: mockUser.organization_id
        }
      }));
      
      // Redirect to Functions view after successful login
      setTimeout(() => {
        onViewChange && onViewChange('functions');
      }, 1000); // Short delay to show success message
      
      return;
    }
    
    // Normal authentication flow for non-development environments
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    setLoading(false);

    if (error) {
      setError(error.message || 'Authentication failed.');
    } else {
      setSuccess(true);
      
      // Get user data from Supabase
      const { data: userData, error: userError } = await supabase
        .from('Users')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (!userError) {
        // Dispatch Redux action to update auth state
        dispatch(loginSuccess({
          session: data.session,
          user: {
            ...data.user,
            ...userData,
            org_id: userData.organization_id
          }
        }));
      }
      
      // Redirect to Functions view after successful login
      setTimeout(() => {
        onViewChange && onViewChange('functions');
      }, 1000); // Short delay to show success message
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess(false);

    if (!resetEmail) {
      setResetError('Email is required.');
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
    setResetLoading(false);

    if (error) {
      setResetError(error.message || 'Failed to send reset email.');
    } else {
      setResetSuccess(true);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          Sign In
        </Typography>
        {!showReset ? (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              sx={inputStyles}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="password"
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              sx={inputStyles}
            />
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Successfully signed in!
              </Alert>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
              ) : null}
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="text"
                onClick={() => setShowReset(true)}
                sx={{ textTransform: 'none' }}
              >
                Forgot password?
              </Button>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Don&apos;t have an account?{' '}
                <Button
                  variant="text"
                  onClick={() => onViewChange && onViewChange('register')}
                  sx={{ textTransform: 'none', padding: 0, minWidth: 0 }}
                >
                  Sign up
                </Button>
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleResetPassword} sx={{ mt: 1 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Reset Password
            </Typography>
            <TextField
              margin="normal"
              required
              fullWidth
              id="resetEmail"
              label="Email"
              name="resetEmail"
              autoComplete="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              disabled={resetLoading}
              sx={inputStyles}
            />
            {resetError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {resetError}
              </Alert>
            )}
            {resetSuccess && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Password reset email sent!
              </Alert>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={resetLoading}
            >
              {resetLoading ? (
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
              ) : null}
              {resetLoading ? 'Sending...' : 'Send reset email'}
            </Button>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="text"
                onClick={() => setShowReset(false)}
                sx={{ textTransform: 'none' }}
              >
                Back to sign in
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Container>
  );
};
LoginForm.propTypes = {
  onViewChange: PropTypes.func
};

export default LoginForm;
