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
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const SettingsForm = ({ onModuleUpdate, /*apiKeys = true*/ }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.auth.user);
  //const activeLicense = useSelector(state => state.license.activeLicense);
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
  const [isLoading, setIsLoading] = useState(false);

  //console.log({currentUser,activeLicenseId})

  // Function to initialize modules and refresh the list
  const initializeModules = async () => {
    try {
      console.log("initalizing module drop down")
      // Fetch modules selected details
      const response = await axiosInstance.get(`/api/admin/modulesselected/license/${activeLicenseId}`);
      
      const modulesSelected = response.data;
      //console.log({modulesSelected})
      
      // Filter modules where f_userBasedKeys is 1 and set available modules for dropdown
      const moduleNames = [...new Set(modulesSelected
        .filter(m => m.fieldData.f_userBasedKeys === "1")
        .map(m => ({
          id: m.fieldData.__ID,
          moduleId: m.fieldData._moduleID,
          name: m.fieldData.moduleName
        })))];
      
      setAvailableModules(moduleNames);
      
    } catch (error) {
      dispatch(createLog(`Failed to initialize modules: ${error.message}`, LogType.ERROR));
      showNotification(`Failed to initialize modules: ${error.message}`, 'error');
    }
  };

  const fetchModuleKeys = async (moduleId) => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(
        `/api/admin/modulesselected/${moduleId}/parties/${currentUser.party_id}/keys`);
      console.log("apiKeys fetch response: ",response)
      if (response.data.api_keys) {
        setApiKeysList(response.data.api_keys)
      } else {
        setApiKeysList([])
      }
    } catch (error) {
      dispatch(createLog(`Failed to fetch module keys: ${error.message}`, LogType.ERROR));
      showNotification(`Failed to fetch module keys: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  // Initialize modules on mount
  useEffect(() => {
    if (currentUser && activeLicenseId) {
      initializeModules();
    }
  }, [currentUser, activeLicenseId]);

  const handleAddField = async () => {
    if (!selectedModule || !selectedField || !fieldValue) return;

    setIsLoading(true);
    try {
      const module = availableModules.find(m => m.id === selectedModule);
      if (!module) {
        throw new Error('Module not found');
      }

      // Create new API key
      await axiosInstance.post(
        `/api/admin/modulesselected/${selectedModule}/parties/${currentUser.party_id}/keys`,
        {
          description: selectedField,
          modules: [module.moduleId],
          type: "userKey",
          privateKey: fieldValue
        }
      );

      // Reinitialize modules to refresh the list
      await initializeModules();

      // Reset field inputs
      setSelectedField('');
      setFieldValue('');

      dispatch(createLog(`Successfully added ${selectedField}`, LogType.INFO));
      showNotification(`Successfully added ${selectedField}`);
      onModuleUpdate?.();
    } catch (err) {
      const errorMsg = `Failed to add service field: ${err.message}`;
      dispatch(createLog(errorMsg, LogType.ERROR));
      showNotification(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteField = async (apiKeyId) => {
    setIsLoading(true);
    try {

      // revoke API key
      await axiosInstance.post(
        `/api/admin/modulesselected/${selectedModule}/parties/${currentUser.party_id}/keys/${apiKeyId}/revoke`);
      
      // Reinitialize keys to refresh the list
      fetchModuleKeys(selectedModule);

      dispatch(createLog('Successfully deleted key', LogType.INFO));
      showNotification('Successfully deleted key');
      onModuleUpdate?.();
    } catch (err) {
      const errorMsg = `Failed to delete key: ${err.message}`;
      dispatch(createLog(errorMsg, LogType.ERROR));
      showNotification(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          LLM Configuration
        </Typography>

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
              onChange={(e) => {
                setSelectedModule(e.target.value);
                if (e.target.value) {
                  fetchModuleKeys(e.target.value);
                }
              }}
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

      <Paper sx={{ p: 2, position: 'relative', minHeight: 100 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Keys
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, position: 'relative' }}>
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
                  label={apiKey.fieldData.description}
                  size="small"
                  color="primary"
                />
                <Typography>
                  Value: {'•'.repeat(Math.max(0, apiKey.fieldData.privateKey.length - 8)) + apiKey.fieldData.privateKey.slice(-8)}
                </Typography>
              </Box>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteField(apiKey.fieldData.__ID)}
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
