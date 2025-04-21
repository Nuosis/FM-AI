import { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { updatePassword } from '../../redux/slices/authSlice';
import {
  Box,
  Button,
  Typography,
  TextField,
  CircularProgress
} from '@mui/material';

/**
 * PasswordForm component for handling password changes
 * Allows users to securely update their password
 */
const PasswordForm = ({ onSuccess, onError }) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  
  // Password reset state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const validatePasswordForm = () => {
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return false;
    }
    
    if (!newPassword) {
      setPasswordError('New password is required');
      return false;
    }
    
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return false;
    }
    
    setPasswordError('');
    return true;
  };
  
  const handlePasswordReset = async () => {
    if (!validatePasswordForm()) return;
    
    setIsLoading(true);
    try {
      const result = await dispatch(updatePassword({
        currentPassword,
        newPassword
      })).unwrap();
      
      // Clear form fields on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      if (onSuccess) {
        onSuccess(result.message || 'Password updated successfully');
      }
    } catch (error) {
      const errorMsg = `Failed to update password: ${error}`;
      setPasswordError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Change Password
      </Typography>
      
      <TextField
        label="Current Password"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        fullWidth
        required
      />
      
      <TextField
        label="New Password"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        fullWidth
        required
        helperText="Password must be at least 8 characters long"
      />
      
      <TextField
        label="Confirm New Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        fullWidth
        required
        error={!!passwordError}
        helperText={passwordError || ''}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handlePasswordReset}
          disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          Update Password
        </Button>
      </Box>
    </Box>
  );
};

PasswordForm.propTypes = {
  onSuccess: PropTypes.func,
  onError: PropTypes.func
};

export default PasswordForm;