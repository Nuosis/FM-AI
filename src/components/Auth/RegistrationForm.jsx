import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { signUpWithEmail } from '../../redux/slices/authSlice';
import { createLog, LogType } from '../../redux/slices/appSlice';
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  CircularProgress,
  Alert,
  Link
} from '@mui/material';

// Test VITE environment variables
console.log('Testing VITE env variables:');
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

requiredEnvVars.forEach(varName => {
  const value = import.meta.env[varName];
  console.log(`${varName}: ${value ? '✓ loaded' : '✗ missing'}`);
  if (!value) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

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

const RegistrationForm = ({ onViewChange }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationId: import.meta.env.VITE_PUBLIC_KEY || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    dispatch(createLog('Registration form mounted', LogType.DEBUG));
    return () => {
      dispatch(createLog('Registration form unmounted', LogType.DEBUG));
    };
  }, [dispatch]);


  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }
    return errors;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const errors = {};
    
    // Required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
    requiredFields.forEach(field => {
      if (!formData[field].trim()) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });

    // Email validation
    if (formData.email && !validateEmail(formData.email)) {
      errors.email = 'Invalid email format';
      dispatch(createLog('Invalid email format provided', LogType.WARNING));
    }

    // Password validation
    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      errors.password = passwordErrors;
      dispatch(createLog('Password validation failed: ' + passwordErrors.join(', '), LogType.WARNING));
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      dispatch(createLog('Password confirmation mismatch', LogType.WARNING));
    }

    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      dispatch(createLog('Registration form validation failed', LogType.WARNING));
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
    dispatch(createLog('Registration attempt initiated', LogType.INFO));
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Register user with Supabase
      dispatch(createLog('Creating user account with Supabase', LogType.DEBUG));
      
      const resultAction = await dispatch(signUpWithEmail({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organizationId: formData.organizationId
      }));
      
      if (signUpWithEmail.fulfilled.match(resultAction)) {
        dispatch(createLog('Registration successful', LogType.INFO));
        
        // Reset form and redirect to login
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          organizationId: import.meta.env.VITE_PUBLIC_KEY || ''
        });
        
        dispatch(createLog('Redirecting to login', LogType.DEBUG));
        onViewChange('login');
      } else if (signUpWithEmail.rejected.match(resultAction)) {
        setError(resultAction.payload || 'Registration failed');
        dispatch(createLog(`Registration failed: ${resultAction.payload || 'Unknown error'}`, LogType.ERROR));
      }
    } catch (err) {
      setError(err.message);
      dispatch(createLog(`Registration failed: ${err.message}`, LogType.ERROR));
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    dispatch(createLog('Navigating to login form', LogType.INFO));
    onViewChange('login');
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
          Create your account
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="firstName"
            label="First Name"
            name="firstName"
            autoComplete="given-name"
            autoFocus
            value={formData.firstName}
            onChange={handleChange}
            disabled={loading}
            error={!!validationErrors.firstName}
            helperText={validationErrors.firstName}
            sx={inputStyles}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="lastName"
            label="Last Name"
            name="lastName"
            autoComplete="family-name"
            value={formData.lastName}
            onChange={handleChange}
            disabled={loading}
            error={!!validationErrors.lastName}
            helperText={validationErrors.lastName}
            sx={inputStyles}
          />
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
            error={!!validationErrors.email}
            helperText={validationErrors.email}
            sx={inputStyles}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            error={!!validationErrors.password}
            helperText={
              validationErrors.password && Array.isArray(validationErrors.password)
                ? validationErrors.password.join(', ')
                : validationErrors.password
            }
            sx={inputStyles}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={loading}
            error={!!validationErrors.confirmPassword}
            helperText={validationErrors.confirmPassword}
            sx={inputStyles}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
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
            {loading ? 'Creating account...' : 'Create account'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              component="span"
            >
              Already have an account?{' '}
              <Link
                component="button"
                variant="body2"
                onClick={handleSignIn}
                sx={{ 
                  textDecoration: 'none',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'primary.main',
                  '&:hover': {
                    textDecoration: 'underline',
                    color: 'primary.light'
                  }
                }}
              >
                Sign in
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

RegistrationForm.propTypes = {
  onViewChange: PropTypes.func.isRequired
};

export default RegistrationForm;
