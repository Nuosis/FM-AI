import { useState } from 'react';
// import JwtDebugger from '../Auth/JwtDebugger'; // Adjust the import path as necessary
import { useSelector } from 'react-redux';
import { createLog, LogType } from '../../redux/slices/appSlice';
import {
  Box,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,

} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Import the new component modules
import ProfileForm from './ProfileForm';
import PasswordForm from './PasswordForm';
import PreferencesForm from './PreferencesForm';
import LLMProviderSettings from './LLMProviderSettings';

/**
 * SettingsForm component that orchestrates all settings subcomponents
 * Provides a unified interface for user settings with clear separation of concerns
 */
const SettingsForm = () => {
  const address = useSelector(state => state.address);
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


  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  const showNotification = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
    
    // Also log to Redux for centralized logging
    const logType = severity === 'error' ? LogType.ERROR : LogType.INFO;
    createLog(message, logType);
  };
  
  // Handlers for child component events
  const handleSuccess = (message) => {
    showNotification(message, 'success');
    setIsLoading(false);
  };
  const handleError = (message) => {
    showNotification(message, 'error');
    setIsLoading(false);
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
      
        {/* JWT Section 
        <Accordion
          expanded={expandedPanel === 'jwt'}
          onChange={handleAccordionChange('jwt')}
          sx={{ mt: 4 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="jwt-content"
            id="jwt-header"
          >
            <Typography variant="h6">JWT</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <JwtDebugger /> 
          </AccordionDetails>
        </Accordion> */}
      
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
            {address && (
              <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary', alignSelf: 'center' }}>
                {address.formatted_address || `${address.city}, ${address.state}`}
              </Typography>
            )}
          </AccordionSummary>
          <AccordionDetails>
            <ProfileForm
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </AccordionDetails>
        </Accordion>

        {/*User Settings Section*/}
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
            <Typography variant="h6">Security</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <PasswordForm
              onSuccess={handleSuccess}
              onError={handleError}
            />
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
            <PreferencesForm
              onSuccess={handleSuccess}
              onError={handleError}
            />
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
            <LLMProviderSettings
              onSuccess={handleSuccess}
              onError={handleError}
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

export default SettingsForm;