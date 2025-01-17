import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { createLog, LogType } from '../redux/slices/appSlice';
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
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const SettingsForm = ({ onNotification, onModuleUpdate, apiKeys = true }) => {
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.auth.user);
  const licenseKey = useSelector(state => state.auth.licenseKey);
  const activeLicense = useSelector(state => state.license.activeLicense);
  const authHeader = `LicenseKey ${licenseKey.jwt}:${licenseKey.privateKey}`;
  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [serviceFields, setServiceFields] = useState([]);
  const [addedFields, setAddedFields] = useState([]);

  // Fetch available modules
  const fetchAvailableModules = async (fetchApiKeys = apiKeys) => {
    console.log('fetchAvailableModules called',`fetchApiKeys ${fetchApiKeys}`);
    
    try {
      console.log('Current user:', currentUser); // Immediate console log
      await dispatch(createLog(`Current user: ${JSON.stringify(currentUser)}`, LogType.DEBUG));
      
      // Use module_selected_keys route only when explicitly fetching API keys
      const endpoint = fetchApiKeys 
        ? `/api/admin/modulesselected/${currentUser.org_id}/parties/${currentUser.party_id}/keys`
        : `/api/admin/modulesselected/license/${currentUser.org_id}`;
      
      await dispatch(createLog(`Fetching modules from endpoint: ${endpoint}`, LogType.DEBUG));
      
      console.log('Making API request to:', endpoint); // Immediate console log
      const response = await axiosInstance.get(endpoint, {
        headers: {
          'Authorization': authHeader,
          'X-Organization-Id': currentUser.org_id
        }
      });
      const data = response.data;
      
      console.log('Call response status:', response.status);
      await dispatch(createLog(`Module response status: ${response.status}`, LogType.DEBUG));
      
      const modules = Array.isArray(data) ? data : [];
      console.log('Module names:', modules.map(m => m.fieldData?.moduleName));
      await dispatch(createLog(`Processed modules: ${JSON.stringify(modules.map(m => ({
        id: m.fieldData?.__ID,
        name: m.fieldData?.moduleName
      })))}`, LogType.DEBUG));
      setAvailableModules(modules);
      await dispatch(createLog(`Successfully loaded ${modules.length} available modules`, LogType.INFO));
      
      // Log module details after setting state
      console.log('Available modules after state update:', {
        count: modules.length,
        moduleNames: modules.map(m => m.fieldData?.moduleName),
        hasModuleData: modules.every(m => m.fieldData && m.fieldData.moduleName)
      });
    } catch (err) {
      console.error('Error fetching modules:', err); // Immediate console log
      const errorMsg = `Failed to fetch available modules: ${err.message}`;
      await dispatch(createLog(`Error details: ${JSON.stringify(err.response?.data || err)}`, LogType.ERROR));
      await dispatch(createLog(`Request config: ${JSON.stringify(err.config)}`, LogType.ERROR));
      onNotification?.({
        message: errorMsg,
        severity: 'error'
      });
    }
  };

  // Service field definitions for non-API key modules
  const SERVICE_FIELDS = [
    { key: 'service_apiKey', label: 'API Key' },
    { key: 'service_clientSecret', label: 'Client Secret' },
    { key: 'service_identifier', label: 'Identifier' },
    { key: 'service_refreshToken', label: 'Refresh Token' },
    { key: 'service_token', label: 'Token' },
    { key: 'service_url', label: 'URL' }
  ];

  // API Key field definition
  const API_KEY_FIELD = [{ key: 'apiKeys', label: 'API Key' }];

  // Fetch module fields and check if it's API key based
  const fetchModuleFields = async (moduleId) => {
    try {
      // Find the module record from availableModules
      const module = availableModules.find(m => m.fieldData.__ID === moduleId);
      if (!module) {
        throw new Error('Module not found');
      }

      const isApiKeyBased = module.fieldData.f_userBasedKeys === 1;
      
      // Set available fields based on module type
      setServiceFields(isApiKeyBased ? API_KEY_FIELD : SERVICE_FIELDS);

      if (isApiKeyBased) {
        // Fetch existing API keys
        const response = await axiosInstance.get(
          `/api/admin/modulesselected/${currentUser.org_id}/parties/${currentUser.party_id}/keys`,
          {
            headers: {
              'Authorization': authHeader,
              'X-Organization-Id': currentUser.org_id
            }
          }
        );
        
        const existingKeys = response.data.map(key => ({
          moduleId,
          recordId: module.recordId,
          field: 'API Key',
          value: key.apiKey
        }));
        
        setAddedFields(existingKeys);
      } else {
        // Extract existing service field values for non-API key modules
        const existingFields = SERVICE_FIELDS
          .filter(field => module.fieldData[field.key])
          .map(field => ({
            moduleId,
            recordId: module.recordId,
            field: field.label,
            value: module.fieldData[field.key]
          }));
        setAddedFields(existingFields);
      }
    } catch (err) {
      const errorMsg = `Failed to fetch module fields: ${err.message}`;
      dispatch(createLog(errorMsg, LogType.ERROR));
      onNotification?.({
        message: errorMsg,
        severity: 'error'
      });
    }
  };

  // get available modules and setAvailableModeules
  useEffect(() => {
    dispatch(createLog(`Auth state when SettingsForm mounts: ${JSON.stringify({
      licenseId: currentUser.org_id,
      currentUser,
      activeLicense,
      licenseKey: licenseKey ? {
        jwt: licenseKey.jwt ? `${licenseKey.jwt.slice(0, 10)}...` : null,
        privateKey: licenseKey.privateKey ? `***masked***` : null
      } : null
    }, null, 2)}`, LogType.DEBUG));
    fetchAvailableModules();
  }, []);

  useEffect(() => {
    if (selectedModule) {
      fetchModuleFields(selectedModule);
    }
  }, [selectedModule]);

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
      const module = availableModules.find(m => m.fieldData.__ID === selectedModule);
      if (!module) {
        throw new Error('Module not found');
      }

      const isApiKeyBased = module.fieldData.f_userBasedKeys === 1;

      if (isApiKeyBased) {
        // Create new API key
        await axiosInstance.post(
          `/api/admin/modulesselected/${currentUser.org_id}/parties/${currentUser.party_id}/keys`,
          {
            moduleId: selectedModule,
            apiKey: fieldValue
          },
          {
            headers: {
              'Authorization': authHeader,
              'X-Organization-Id': currentUser.org_id
            }
          }
        );

        // Refresh with API keys
        await fetchAvailableModules(true);
      } else {
        // Handle non-API key fields
        const fieldKey = SERVICE_FIELDS.find(f => f.label === selectedField)?.key;
        if (!fieldKey) {
          throw new Error('Invalid field selected');
        }

        await axiosInstance.patch(
          `/api/admin/modulesselected/${module.recordId}`,
          { [fieldKey]: fieldValue },
          {
            headers: {
              'Authorization': authHeader,
              'X-Organization-Id': currentUser.org_id
            }
          }
        );

        setAddedFields([
          ...addedFields,
          {
            moduleId: selectedModule,
            recordId: module.recordId,
            field: selectedField,
            value: fieldValue
          }
        ]);
      }

      // Reset field inputs
      setSelectedField('');
      setFieldValue('');

      dispatch(createLog('Successfully added service field', LogType.INFO));
      onNotification?.({
        message: 'Successfully added service field',
        severity: 'success'
      });
      onModuleUpdate?.();
    } catch (err) {
      const errorMsg = `Failed to add service field: ${err.message}`;
      dispatch(createLog(errorMsg, LogType.ERROR));
      onNotification?.({
        message: errorMsg,
        severity: 'error'
      });
    }
  };

  // Handle deleting a field
  const handleDeleteField = async (moduleId, field) => {
    try {
      const module = availableModules.find(m => m.fieldData.__ID === moduleId);
      if (!module) {
        throw new Error('Module not found');
      }

      const isApiKeyBased = module.fieldData.f_userBasedKeys === 1;
      const fieldRecord = addedFields.find(f => f.moduleId === moduleId && f.field === field);
      
      if (!fieldRecord) {
        throw new Error('Field record not found');
      }

      if (isApiKeyBased) {
        // Delete API key
        await axiosInstance.delete(
          `/api/admin/modulesselected/${currentUser.org_id}/parties/${currentUser.party_id}/keys/${fieldRecord.value}`,
          {
            headers: {
              'Authorization': authHeader,
              'X-Organization-Id': currentUser.org_id
            }
          }
        );
        
        // Refresh the keys list
        await fetchModuleFields(moduleId);
      } else {
        // Handle non-API key fields
        const fieldKey = SERVICE_FIELDS.find(f => f.label === field)?.key;
        if (!fieldKey) {
          throw new Error('Invalid field selected');
        }

        await axiosInstance.patch(
          `/api/admin/modulesselected/${fieldRecord.recordId}`,
          { [fieldKey]: "" },
          {
            headers: {
              'Authorization': authHeader,
              'X-Organization-Id': currentUser.org_id
            }
          }
        );

        setAddedFields(addedFields.filter(f => 
          !(f.moduleId === moduleId && f.field === field)
        ));
      }

      dispatch(createLog('Successfully deleted service field', LogType.INFO));
      onNotification?.({
        message: 'Successfully deleted service field',
        severity: 'success'
      });
      onModuleUpdate?.();
    } catch (err) {
      const errorMsg = `Failed to delete service field: ${err.message}`;
      dispatch(createLog(errorMsg, LogType.ERROR));
      onNotification?.({
        message: errorMsg,
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        {currentUser?.org_id ? 'Organization' : ''} Service Configuration
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Module</InputLabel>
          <Select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            label="Module"
          >
            {availableModules.map((module) => (
              <MenuItem key={module.fieldData.__ID} value={module.fieldData.__ID}>
                {module.fieldData.moduleName}
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

        <TextField
          label="Value"
          value={fieldValue}
          onChange={(e) => setFieldValue(e.target.value)}
          disabled={!selectedField}
          sx={{ minWidth: 200 }}
        />

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddField}
          disabled={!selectedModule || !selectedField || !fieldValue}
        >
          Add Field
        </Button>
      </Box>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Keys
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {addedFields.map((field, index) => {
            const module = availableModules.find(m => m.fieldData.__ID === field.moduleId);
            return (
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
                    label={module?.fieldData.moduleName || 'Unknown Module'}
                    size="small"
                    color="primary"
                  />
                  <Typography>
                    {field.field}: {maskValue(field.value)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteField(field.moduleId, field.field)}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            );
          })}
          {addedFields.length === 0 && (
            <Typography color="textSecondary">
              No keys added yet
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

SettingsForm.propTypes = {
  onNotification: PropTypes.func,
  onModuleUpdate: PropTypes.func,
  apiKeys: PropTypes.bool
};

export default SettingsForm;
