import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { signInWithEmail } from '../../redux/slices/authSlice';
import supabaseService from '../../services/supabaseService';
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

  // Get auth state from Redux
  const { loading: authLoading, error: authError, isAuthenticated, user } = useSelector(state => state.auth);
  
  // Update local state based on Redux state
  useEffect(() => {
    if (authLoading !== loading) {
      setLoading(authLoading);
    }
    
    if (authError && authError !== error) {
      setError(authError);
      setSuccess(false);
    }
    
    if (isAuthenticated && user) {
      setSuccess(true);
      setError('');
      
      // Redirect to LLMChat view after successful login
      setTimeout(() => {
        onViewChange && onViewChange('chat');
      }, 1000);
    }
  }, [authLoading, authError, isAuthenticated, user, loading, error, onViewChange]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Email and password are required.');
      return;
    }
    
    // Clear any previous errors
    setError('');
    setSuccess(false);
    
    // Use the Redux thunk for authentication
    dispatch(signInWithEmail({
      email: formData.email,
      password: formData.password
    }));
  };

  /**
   * Handles password reset form submission.
   * @param {React.FormEvent} e - The form event.
   * @returns {Promise<void>}
   */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess(false);

    if (!resetEmail) {
      setResetError('Email is required.');
      return;
    }

    setResetLoading(true);
    
    try {
      // We'll keep this direct call since there's no Redux thunk for password reset
      // In a complete refactoring, we would add a resetPassword thunk to authSlice
      const { error } = await supabaseService.executeQuery(supabase =>
        supabase.auth.resetPasswordForEmail(resetEmail)
      );
      
      if (error) {
        throw error;
      }
      
      setResetSuccess(true);
    } catch (error) {
      setResetError(error.message || 'Failed to send reset email.');
    } finally {
      setResetLoading(false);
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
/**
 * LoginForm component for user authentication.
 *
 * @component
 * @param {Object} props
 * @param {function} props.onViewChange - Callback to change the current view.
 * @returns {JSX.Element}
 */
LoginForm.propTypes = {
  onViewChange: PropTypes.func
};

export default LoginForm;
