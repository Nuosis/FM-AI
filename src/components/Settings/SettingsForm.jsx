import { useState, useEffect } from 'react';
// import JwtDebugger from '../Auth/JwtDebugger'; // Adjust the import path as necessary
import { useSelector } from 'react-redux';
import { createLog, LogType } from '../../redux/slices/appSlice';
import axios from 'axios';
import {
  Box,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Chip,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Import the new component modules
import ProfileForm from './ProfileForm';
import PasswordForm from './PasswordForm';
import PreferencesForm from './PreferencesForm';
import LLMProviderSettings from './LLMProviderSettings';
import DataStoreSettings from './DataStoreSettings';
import LLMProxyTester from './LLMProxyTester';
import ToolTesting from './ToolTesting';

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
  const [serviceStatus, setServiceStatus] = useState({
    llm: { status: 'unknown', message: 'Checking...' },
    dataStore: { status: 'unknown', message: 'Checking...' },
    docling: { status: 'unknown', message: 'Checking...' }
  });
  
  // Check health of mesh_server services
  useEffect(() => {
    const checkServiceHealth = async () => {
      // Check LLM Proxy health
      try {
        const llmResponse = await axios.get('http://localhost:3500/health', { timeout: 2000 });
        if (llmResponse.status === 200 && llmResponse.data.status === 'healthy') {
          setServiceStatus(prev => ({
            ...prev,
            llm: { status: 'connected', message: 'Connected' }
          }));
        } else {
          setServiceStatus(prev => ({
            ...prev,
            llm: { status: 'error', message: 'Error' }
          }));
        }
      } catch {
        setServiceStatus(prev => ({
          ...prev,
          llm: { status: 'disconnected', message: 'Not connected' }
        }));
      }

      // Check Data Store health
      try {
        const dataStoreResponse = await axios.get('http://localhost:3550/api/data-store/health', { timeout: 2000 });
        if (dataStoreResponse.status === 200) {
          setServiceStatus(prev => ({
            ...prev,
            dataStore: { status: 'connected', message: 'Connected' }
          }));
        } else {
          setServiceStatus(prev => ({
            ...prev,
            dataStore: { status: 'error', message: 'Error' }
          }));
        }
      } catch {
        setServiceStatus(prev => ({
          ...prev,
          dataStore: { status: 'disconnected', message: 'Not connected' }
        }));
      }

      // Check Docling health
      try {
        const doclingResponse = await axios.get('http://localhost:3600/docling/health', { timeout: 2000 });
        if (doclingResponse.status === 200) {
          setServiceStatus(prev => ({
            ...prev,
            docling: { status: 'connected', message: 'Connected' }
          }));
        } else {
          setServiceStatus(prev => ({
            ...prev,
            docling: { status: 'error', message: 'Error' }
          }));
        }
      } catch {
        setServiceStatus(prev => ({
          ...prev,
          docling: { status: 'disconnected', message: 'Not connected' }
        }));
      }
    };

    checkServiceHealth();
  }, []);
  
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
        {/* Service Status Header */}
        <Paper
          elevation={0}
          sx={{
            p: 1,
            mb: 2,
            backgroundColor: 'rgba(0, 0, 0, 0.03)',
            borderRadius: 1,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <Stack direction="row" spacing={1}>
            <Chip
              size="small"
              label={`LLM: ${serviceStatus.llm.message}`}
              color={serviceStatus.llm.status === 'connected' ? 'success' :
                    serviceStatus.llm.status === 'disconnected' ? 'error' : 'default'}
              variant="outlined"
            />
            <Chip
              size="small"
              label={`Data Store: ${serviceStatus.dataStore.message}`}
              color={serviceStatus.dataStore.status === 'connected' ? 'success' :
                    serviceStatus.dataStore.status === 'disconnected' ? 'error' : 'default'}
              variant="outlined"
            />
            <Chip
              size="small"
              label={`Docling: ${serviceStatus.docling.message}`}
              color={serviceStatus.docling.status === 'connected' ? 'success' :
                    serviceStatus.docling.status === 'disconnected' ? 'error' : 'default'}
              variant="outlined"
            />
          </Stack>
        </Paper>
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

        {/* Data Store Settings */}
        <Accordion
          expanded={expandedPanel === 'data-store'}
          onChange={handleAccordionChange('data-store')}
          sx={{ mt: 2 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="data-store-content"
            id="data-store-header"
          >
            <Typography variant="h6">Data Store Configuration</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <DataStoreSettings
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </AccordionDetails>
        </Accordion>

        {/* LLM Proxy Tester - Only render if VITE_LLM_TEST is true */}
        {import.meta.env.VITE_LLM_TEST === 'true' && (
          <Accordion
            expanded={expandedPanel === 'llm-proxy-tester'}
            onChange={handleAccordionChange('llm-proxy-tester')}
            sx={{ mt: 2 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="llm-proxy-tester-content"
              id="llm-proxy-tester-header"
            >
              <Typography variant="h6">LLM Proxy Tester</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <LLMProxyTester />
            </AccordionDetails>
          </Accordion>
        )}

        {/* Tool Testing - Only render if VITE_TOOL_TESTING is true */}
        {import.meta.env.VITE_TOOL_TEST === 'true' && (
          <Accordion
            expanded={expandedPanel === 'tool-testing'}
            onChange={handleAccordionChange('tool-testing')}
            sx={{ mt: 2 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="tool-testing-content"
              id="tool-testing-header"
            >
              <Typography variant="h6">Tool Testing</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ToolTesting
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </AccordionDetails>
          </Accordion>
        )}

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