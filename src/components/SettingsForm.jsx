import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { createLog, LogType } from '../redux/slices/appSlice';
import { selectActiveLicenseId } from '../redux/slices/licenseSlice';
import axiosInstance from '../utils/axios';
import {
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Paper,
  Chip,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const SettingsForm = ({ onModuleUpdate, apiKeys = true }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.auth.user);
  const licenseKey = useSelector(state => state.auth.licenseKey);
  const activeLicense = useSelector(state => state.license.activeLicense);
  const authHeader = `LicenseKey ${licenseKey.jwt}:${licenseKey.privateKey}`;
  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  // Set service fields to only show API Key option
  const serviceFields = [{ key: 'apiKeys', label: 'API Key' }];

  // Initialize state for API keys
  const [apiKeysList, setApiKeysList] = useState([]);
  const activeLicenseId = useSelector(selectActiveLicenseId);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const showNotification = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Function to initialize modules and refresh the list
  const initializeModules = async () => {
    try {
      // Get API keys from user state
      const userApiKeys = currentUser?.apiKeys || [];
      
      // Fetch modules selected details
      const response = await axiosInstance.get(`/api/admin/modulesselected/license/${activeLicenseId}`, {
        headers: {
          'Authorization': authHeader,
          'X-Organization-Id': currentUser.org_id
        }
      });
      
      const modulesSelected = response.data;
      
      // Map API keys with module names
      const mappedKeys = userApiKeys.map(apiKey => {
        const module = modulesSelected.find(m => m.fieldData.__ID === apiKey._moduleSelectedID);
        return {
          ...apiKey,
          moduleName: module?.fieldData?.moduleName || 'Unknown Module',
          maskedKey: maskValue(apiKey.key)
        };
      });
      
      setApiKeysList(mappedKeys);
      
      // Set available modules for dropdown
      const moduleNames = [...new Set(modulesSelected.map(m => ({
        id: m.fieldData.__ID,
        name: m.fieldData.moduleName
      })))];
      
      setAvailableModules(moduleNames);
      
    } catch (error) {
      dispatch(createLog(`Failed to initialize modules: ${error.message}`, LogType.ERROR));
      showNotification(`Failed to initialize modules: ${error.message}`, 'error');
    }
  };

  // Initialize modules on mount
  useEffect(() => {
    if (currentUser && activeLicenseId) {
      initializeModules();
    }
  }, [currentUser, activeLicenseId]);

  // Mask sensitive values
  const maskValue = (value) => {
    if (!value) return '';
    if (value.length <= 8) {
      return value.slice(0, 2) + '***' + value.slice(-2);
    }
    return value.slice(0, 4) + '***' + value.slice(-4);
  };

  // Handle adding a new field
  const handleAddField = async () => {
    if (!selectedModule || !selectedField || !fieldValue) return;

    try {
      const module = availableModules.find(m => m.id === selectedModule);
      if (!module) {
        throw new Error('Module not found');
      }

      // Create new API key
      await axiosInstance.post(
        `/api/admin/modules-selected/${selectedModule}/parties/${currentUser.party_id}/keys`,
        {
          description: `${module.name} ${selectedField}`,
          modules: [selectedModule],
          type: "userKey"
        },
        {
          headers: {
            'X-Organization-Id': currentUser.org_id
          }
        }
      );

      // Reinitialize modules to refresh the list
      await initializeModules();

      // Reset field inputs
      setSelectedField('');
      setFieldValue('');

      dispatch(createLog('Successfully added service field', LogType.INFO));
      showNotification('Successfully added service field');
      onModuleUpdate?.();
    } catch (err) {
      const errorMsg = `Failed to add service field: ${err.message}`;
      dispatch(createLog(errorMsg, LogType.ERROR));
      showNotification(errorMsg, 'error');
    }
  };

  // Handle deleting a field
  const handleDeleteField = async (moduleId, field) => {
    try {
      const apiKey = apiKeysList.find(key => key._moduleSelectedID === moduleId);
      if (!apiKey) {
        throw new Error('API key not found');
      }

      // Delete API key
      await axiosInstance.delete(
        `/api/admin/modulesselected/${currentUser.org_id}/parties/${currentUser.party_id}/keys/${apiKey.key}`,
        {
          headers: {
            'Authorization': authHeader,
            'X-Organization-Id': currentUser.org_id
          }
        }
      );
      
      // Reinitialize modules to refresh the list
      initializeModules();

      dispatch(createLog('Successfully deleted service field', LogType.INFO));
      showNotification('Successfully deleted service field');
      onModuleUpdate?.();
    } catch (err) {
      const errorMsg = `Failed to delete service field: ${err.message}`;
      dispatch(createLog(errorMsg, LogType.ERROR));
      showNotification(errorMsg, 'error');
    }
  };

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          {currentUser?.org_id ? 'Organization' : ''} Service Configuration
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' }, 
          gap: 2
        }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Module</InputLabel>
            <Select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              label="Module"
            >
              {availableModules.map((module) => (
                <MenuItem key={module.id} value={module.id}>
                  {module.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Field</InputLabel>
            <Select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              label="Field"
              disabled={!selectedModule}
            >
              {serviceFields.map((field) => (
                <MenuItem key={field.key} value={field.label}>
                  {field.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          gap: 2,
          width: '100%'
        }}>
          <TextField
            label="Value"
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            disabled={!selectedField}
            sx={{ minWidth: 200, flex: 1 }}
          />

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddField}
            disabled={!selectedModule || !selectedField || !fieldValue}
            sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}
          >
            Add Field
          </Button>
          </Box>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Keys
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {apiKeysList.map((apiKey, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1,
                bgcolor: 'background.default',
                borderRadius: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={apiKey.moduleName}
                  size="small"
                  color="primary"
                />
                <Typography>
                  API Key: {apiKey.maskedKey}
                </Typography>
              </Box>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteField(apiKey._moduleSelectedID, 'API Key')}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          {apiKeysList.length === 0 && (
            <Typography color="textSecondary">
              No keys added yet
            </Typography>
          )}
        </Box>
      </Paper>
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

SettingsForm.propTypes = {
  onModuleUpdate: PropTypes.func,
  apiKeys: PropTypes.bool
};

export default SettingsForm;
