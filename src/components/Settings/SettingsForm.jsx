import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createLog, LogType } from '../../redux/slices/appSlice';
import { updatePassword, updateProfile } from '../../redux/slices/authSlice';
import { setDarkMode } from '../../redux/slices/llmSlice';
import {
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LLMProviderConfigSection from './SettingsForm_LLMProviderConfigSection';

const SettingsForm = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.auth.user);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState('profile');
  
  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };
  
  // Password reset state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Get preferences from Redux store
  const preferences = useSelector(state => ({
    darkMode: state.llm.darkMode || 'system',
    defaultProvider: state.llm.defaultProvider || 'openAI',
    preferredStrongModel: state.llm.preferredStrongModel || '',
    preferredWeakModel: state.llm.preferredWeakModel || '',
    apiKeyStorage: state.llm.apiKeyStorage || 'local'
  }));

  // Check if we're in development mode with AUTH_MOCK
  const isAuthMock = import.meta.env.VITE_AUTH_MOCK === 'true';


  const showNotification = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Initialize profile fields on mount
  useEffect(() => {
    if (currentUser) {
      setFirstName(currentUser.first_name || '');
      setLastName(currentUser.last_name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setLocation(currentUser.location || '');
    }
  }, [currentUser]);

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
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
      
      showNotification(result.message, 'success');
      dispatch(createLog('Password updated successfully', LogType.INFO));
    } catch (error) {
      const errorMsg = `Failed to update password: ${error}`;
      setPasswordError(errorMsg);
      dispatch(createLog(errorMsg, LogType.ERROR));
      showNotification(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const validateProfileForm = () => {
    // Basic validation for profile fields
    if (!firstName.trim()) {
      setProfileError('First name is required');
      return false;
    }
    
    if (!lastName.trim()) {
      setProfileError('Last name is required');
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setProfileError('Please enter a valid email address');
      return false;
    }
    
    // Phone validation (optional field)
    if (phone) {
      const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
      if (!phoneRegex.test(phone)) {
        setProfileError('Please enter a valid phone number');
        return false;
      }
    }
    
    setProfileError('');
    return true;
  };
  
  const handleProfileUpdate = async () => {
    if (!validateProfileForm()) return;
    
    setIsLoading(true);
    setProfileSuccess(false);
    
    try {
      const result = await dispatch(updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        location
      })).unwrap();
      
      setProfileSuccess(true);
      showNotification(result.message, 'success');
      dispatch(createLog('Profile updated successfully', LogType.INFO));
    } catch (error) {
      const errorMsg = `Failed to update profile: ${error}`;
      setProfileError(errorMsg);
      dispatch(createLog(errorMsg, LogType.ERROR));
      showNotification(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Box sx={{ p: 3 }}>
        {/* Spinner overlay for the entire form */}
        {isLoading && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              zIndex: 1300, // High z-index to overlay other elements
            }}
        >
          <CircularProgress />
        </Box>
      )}
      
      {/* Profile Section */}
      <Accordion
        expanded={expandedPanel === 'profile'}
        onChange={handleAccordionChange('profile')}
        sx={{ mt: 4 }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="profile-content"
          id="profile-header"
        >
          <Typography variant="h6">Profile</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Personal Information
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2
            }}>
              <TextField
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
                required
              />
              
              <TextField
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
                required
              />
            </Box>
            
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              disabled // Email is managed by auth system and cannot be changed here
              helperText="Email cannot be changed here. Please contact support for email changes."
            />
            
            <TextField
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              placeholder="e.g., +1 (555) 123-4567"
            />
            
            <TextField
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              fullWidth
              placeholder="e.g., San Francisco, CA"
            />
            
            {profileError && (
              <Typography color="error" variant="body2">
                {profileError}
              </Typography>
            )}
            
            {profileSuccess && (
              <Typography color="success.main" variant="body2">
                Profile updated successfully!
              </Typography>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleProfileUpdate}
                disabled={isLoading}
              >
                Update Profile
              </Button>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
      
      {/* User Settings Section */}
      <Accordion
        expanded={expandedPanel === 'user-settings'}
        onChange={handleAccordionChange('user-settings')}
        sx={{ mt: 2 }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="user-settings-content"
          id="user-settings-header"
        >
          <Typography variant="h6">User Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Reset Password
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            
            <Button
              variant="contained"
              color="primary"
              onClick={handlePasswordReset}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Reset Password
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Preferences Section */}
      <Accordion
        expanded={expandedPanel === 'preferences'}
        onChange={handleAccordionChange('preferences')}
        sx={{ mt: 2 }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="preferences-content"
          id="preferences-header"
        >
          <Typography variant="h6">Preferences</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Dark Mode Preference */}
            <FormControl fullWidth>
              <InputLabel>Dark Mode</InputLabel>
              <Select
                value={preferences.darkMode}
                onChange={(e) => dispatch(setDarkMode(e.target.value))}
                label="Dark Mode"
              >
                <MenuItem value="system">System Default</MenuItem>
                <MenuItem value="dark">Always On</MenuItem>
                <MenuItem value="light">Always Off</MenuItem>
              </Select>
            </FormControl>
            
            {/* Dark Mode is the only preference kept in this section */}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* LLM Provider Configurations */}
      <Accordion
        expanded={expandedPanel === 'llm-provider'}
        onChange={handleAccordionChange('llm-provider')}
        sx={{ mt: 2 }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="llm-provider-content"
          id="llm-provider-header"
        >
          <Typography variant="h6">LLM Provider Configurations</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <LLMProviderConfigSection
            userId={currentUser?.id}
            isAuthMock={isAuthMock}
            apiKeyStorage={preferences.apiKeyStorage}
            showNotification={showNotification}
          />
        </AccordionDetails>
      </Accordion>

      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

SettingsForm.propTypes = {};

export default SettingsForm;